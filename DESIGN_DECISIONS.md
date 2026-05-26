# Design Decisions

This document records architectural decisions made during development, following the ADR (Architecture Decision Record) format.

## 1. Use JSONB for User Credentials and Exercise Data

**Context**

User attributes (email, name, password) and exercise metadata (name, finger, flexion, reps) are stored in the database. We needed to decide between normalized columns vs. flexible storage.

**Decision**

Store user data in `users.data` JSONB column instead of separate columns (`email TEXT`, `name TEXT`, `password TEXT`). Similarly, store exercise assignments and results in JSONB columns.

**Consequences**

Positive:
- Flexible schema allows adding fields without migrations
- Easy to store arbitrary device data from ESP32-C3 without schema changes
- Simpler queries for nested data (e.g., `data->>'email'`)

Negative:
- No database-level type enforcement
- Application must validate JSONB structure
- Harder to index specific fields (requires GIN indexes or expression indexes)
- Queries using JSONB operators are less readable than standard column references
- Cannot use foreign key constraints on JSONB fields

**Implementation Evidence**

```sql
-- schema.sql:16-20
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('doctor', 'patient', 'admin')) NOT NULL,
  data JSONB
);

-- sql/data.sql:14-18
INSERT INTO users (role, data) VALUES
  ('patient', '{"email": "aliyaa@therahand.com","password": "$2b$10$...","name": "Aliyaa"}'),
  ...
```

```javascript
// src/app.js:36-37
const result = await pool.query(
  "SELECT id, role, data FROM users WHERE data->>'email' = $1", [email]
);
```

---

## 2. Database Trigger for Message Permission Enforcement

**Context**

Messages should only be exchanged between doctors and their assigned patients. We could enforce this in application code or at the database level.

**Decision**

Implement `validate_message_permissions()` trigger function that fires `BEFORE INSERT` on the `messages` table. The trigger validates sender and recipient roles and ensures patients can only message their assigned doctor.

**Consequences**

Positive:
- Enforcement cannot be bypassed by direct SQL queries or alternative API clients
- Centralized validation logic (single source of truth)
- Clearer security guarantees (database-level constraint)

Negative:
- Harder to debug (errors raised in trigger appear as generic 500 errors)
- Less visible to developers (logic hidden in database)
- Cannot easily unit test trigger logic without database
- Error messages from triggers are generic "Internal Server Error" to clients

**Implementation Evidence**

```sql
-- schema.sql:59-89
CREATE OR REPLACE FUNCTION validate_message_permissions()
RETURNS TRIGGER AS $$
DECLARE
  sender_role TEXT;
  recipient_role TEXT;
  is_assigned BOOLEAN;
BEGIN
  SELECT role INTO sender_role FROM users WHERE id = NEW.sender_id;
  SELECT role INTO recipient_role FROM users WHERE id = NEW.recipient_id;

  IF sender_role = 'doctor' AND recipient_role = 'patient' THEN
    RETURN NEW;
  END IF;

  IF sender_role = 'patient' AND recipient_role = 'doctor' THEN
    SELECT EXISTS (...) INTO is_assigned;
    IF is_assigned THEN RETURN NEW;
    ELSE RAISE EXCEPTION 'Patient is not assigned to this doctor';
    END IF;
  END IF;

  RAISE EXCEPTION 'Invalid message direction from % to %', sender_role, recipient_role;
END;
$$ LANGUAGE plpgsql;
```

---

## 3. Single Doctor per Patient Constraint

**Context**

The application supports doctor-patient relationships. We needed to decide if patients could have multiple doctors or if assignment should be one-to-one.

**Decision**

Enforce single doctor per patient via `doctor_patients` junction table with unique constraint on `patient_id`. Patients cannot have multiple assigned doctors.

**Consequences**

Positive:
- Simplifies authorization logic (one doctor to check, not multiple)
- Clearer messaging workflow (patient messages go to one known doctor)
- Easier to implement UI (single "My Doctor" display)

Negative:
- No support for multi-provider care (e.g., physical therapist + orthopedic surgeon)
- Inflexible for real-world healthcare scenarios
- Reassigning patients requires deleting old relationship

**Implementation Evidence**

```sql
-- schema.sql:34-38
CREATE TABLE doctor_patients (
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  PRIMARY KEY (doctor_id, patient_id)
);
```

The `PRIMARY KEY (doctor_id, patient_id)` allows multiple rows with the same `doctor_id` (one doctor, many patients) but prevents multiple rows with the same `patient_id` (one patient, one doctor).

---

## 4. JWT with Symmetric Signing (HS256)

**Context**

The application requires stateless authentication for API requests from both browser clients and IoT devices. We needed to choose between symmetric (HMAC) and asymmetric (RSA) JWT signing.

**Decision**

Use symmetric HS256 signing with a single `JWT_SECRET` shared between all backend instances.

**Consequences**

Positive:
- Simpler implementation (single secret, no key pairs)
- Faster signing and verification (HMAC vs RSA operations)
- Adequate for single-server or horizontally scaled backends (all share same secret)

Negative:
- Cannot verify tokens without the secret (no public key distribution)
- Secret must be securely shared across all backend instances
- If secret leaks, all issued tokens are compromised
- No support for decentralized token verification (e.g., edge services validating tokens)

**Implementation Evidence**

```javascript
// src/app.js:20
const secret = process.env.JWT_SECRET;

// src/app.js:45-48
const accessToken = jwt.sign(
  { id: user.id, role: user.role },
  secret,
  { expiresIn: '30m', algorithm: 'HS256' }
);

// src/app.js:70-75
jwt.verify(token, secret, (err, user) => {
  if (err) return res.sendStatus(403);
  req.user = user;
  next();
});
```

---

## 5. No Authentication for Device Result Submission

**Context**

ESP32-C3 devices need to submit exercise results to the backend. We needed to decide if devices should authenticate (e.g., with API keys or device tokens) or if submission endpoints should be public.

**Decision**

Device result submission endpoint (`POST /v0/results/{device_id}`) does not require authentication. Devices only need to know their `device_id` to submit data.

**Consequences**

Positive:
- Simpler device implementation (no token management on constrained hardware)
- No risk of token expiration during exercise sessions
- Faster prototyping

Negative:
- Any client can submit results to any device_id if they guess the UUID
- No audit trail of which device submitted data
- Cannot revoke device access without removing device from database
- Vulnerable to replay attacks (submit same result multiple times)

**Implementation Evidence**

```javascript
// src/app.js:805
app.post('/v0/results/:device_id', addResultForDevice); // No `check` middleware
```

Compare to authenticated endpoints:

```javascript
// src/app.js:804
app.get('/v0/results/:device_id', check, getResultsForDevice); // Requires JWT
```

---

## 6. Docker Compose for Database Management

**Context**

The application requires PostgreSQL with specific schema and seed data. We needed to choose between manual database setup instructions, hosted database services, or containerized local database.

**Decision**

Use Docker Compose to run PostgreSQL locally with automatic schema and seed data initialization via `docker-entrypoint-initdb.d` volume mount.

**Consequences**

Positive:
- Reproducible database setup (single `docker compose up`)
- No manual SQL execution required
- Version-controlled schema and seed data
- Isolated from host system PostgreSQL installations
- Easy to reset (docker compose down -v)

Negative:
- Requires Docker installation (additional dependency)
- Database data is lost on volume removal (no persistence by default)
- No guidance for production database deployment
- Cannot easily migrate schema (init scripts only run on fresh container)

**Implementation Evidence**

```yaml
# docker-compose.yml:2-14
services:
  postgres:
    container_name: thera-hand-backend
    image: postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - ./sql/schema.sql:/docker-entrypoint-initdb.d/1.schema.sql
      - ./sql/data.sql:/docker-entrypoint-initdb.d/2.data.sql
```

---

## 7. Wildcard Dependency Versions

**Context**

The project uses npm for dependency management. We needed to decide whether to pin exact versions, use semantic versioning ranges, or use wildcards.

**Decision**

Use wildcard `*` for all npm dependencies in `package.json`.

**Consequences**

Positive:
- Always installs latest compatible versions
- Automatic bug fixes and security patches
- Faster prototyping (no version research required)

Negative:
- Non-reproducible builds (different developers get different versions)
- Breaking changes can cause unexpected failures
- Harder to debug version-specific issues
- Production deployments are unpredictable
- No lockfile committed (exacerbates reproducibility issues)

**Implementation Evidence**

```json
// package.json:9-36
"dependencies": {
  "@emotion/react": "*",
  "@emotion/styled": "*",
  "@mui/icons-material": "*",
  "@mui/material": "*",
  "express": "*",
  "pg": "*",
  "react": "*",
  ...
}
```

**Current Status:** This decision should be reversed for production. Pin versions and commit `package-lock.json`.

---

## 8. Three.js for 3D Hand Model Rendering

**Context**

The application needs to display a 3D hand model to demonstrate exercises. We needed to choose a rendering library.

**Decision**

Use Three.js via React Three Fiber (`@react-three/fiber`) and Drei helpers (`@react-three/drei`).

**Consequences**

Positive:
- Industry-standard WebGL library with extensive documentation
- React Three Fiber provides declarative React API for Three.js
- Drei provides prebuilt controls, loaders, and helpers
- GLTF model support (rigged_hand model is GLTF format)
- Active community and ecosystem

Negative:
- Large bundle size (three@0.176.0 is ~600KB minified)
- Requires WebGL-capable browser (no fallback for older devices)
- Performance varies across devices and GPUs
- Learning curve for Three.js concepts (scenes, cameras, lights)

**Implementation Evidence**

```javascript
// src/HandModel.jsx:45-46
import { Canvas } from "@react-three/fiber";
import { HandModel } from "./HandModel";

// src/Home.jsx:1084-1087
<Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
  <ambientLight intensity={0.5} />
  <HandModel modelPath="/rigged_hand/scene.gltf" />
</Canvas>
```

```json
// package.json:14-15, 35
"@react-three/drei": "*",
"@react-three/fiber": "*",
"three": "^0.176.0"
```

---

## 9. OpenAPI Validation Middleware

**Context**

The backend API needs to validate incoming requests and outgoing responses against a specification. We needed to decide between manual validation, JSON Schema, or OpenAPI validation.

**Decision**

Use `express-openapi-validator` middleware to validate requests and responses against `api/openapi.yaml`.

**Consequences**

Positive:
- Single source of truth for API contract (openapi.yaml)
- Automatic request validation (prevents invalid data from reaching handlers)
- Automatic response validation (catches handler bugs)
- Swagger UI auto-generated from spec
- Industry-standard API documentation format

Negative:
- Validation errors can be verbose and hard to interpret
- Strict validation may reject valid edge cases
- Response validation slows down development (handlers must match spec exactly)
- OpenAPI 3.0 spec is complex and verbose

**Implementation Evidence**

```javascript
// src/app.js:775-779
app.use(OpenApiValidator.middleware({
  apiSpec,
  validateRequests: true,
  validateResponses: true,
}));
```

```yaml
# api/openapi.yaml:1-3
openapi: '3.0.3'
info:
  title: CSE186 Assignment 8 Backend
  version: 0.1.0
```

---

## 10. Role-Based Access Control with Middleware

**Context**

The application has three user roles (admin, doctor, patient) with different permissions. We needed to decide how to enforce authorization.

**Decision**

Implement role-based access control via JWT middleware (`check`) that attaches `req.user.role` and `req.user.id`, then apply role checks in individual route handlers.

**Consequences**

Positive:
- Centralized authentication logic (single middleware)
- Flexible per-route authorization (handlers decide role requirements)
- Easy to audit (grep for `req.user.role` checks)
- Testable (mock `req.user` in handler tests)

Negative:
- No centralized authorization policy (each handler implements checks)
- Easy to forget authorization checks in new endpoints
- Harder to enforce consistency across routes
- No declarative role requirements (must read handler code)

**Implementation Evidence**

```javascript
// src/app.js:65-76 (authentication middleware)
const check = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.sendStatus(401);

  const token = authHeader.split(' ')[1];
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// src/app.js:389-394 (authorization in handler)
const getAllDoctors = async (req, res) => {
  const requester = req.user;
  if (requester.role !== 'admin') {
    return res.status(403).send('Only an admin can view all doctors');
  }
  ...
};
```

---

## Summary

These design decisions reflect the application's evolution from a course project prototype to a functional healthcare platform. Several decisions prioritize rapid development over production robustness (wildcard dependencies, no device authentication). Future iterations should address these tradeoffs for production deployment.
