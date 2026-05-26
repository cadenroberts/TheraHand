# Repository Audit

## 1. Purpose

TheraHand is a full-stack healthcare platform for physical therapy hand exercise management. It connects three user roles (admins, doctors, patients) and integrates with ESP32-C3 IoT devices to track and manage hand rehabilitation exercises.

Core capabilities:
- Role-based authentication (admin, doctor, patient)
- Doctor-patient assignment and management
- Secure messaging between doctors and assigned patients
- Exercise assignment and tracking
- IoT device registration and data collection
- Real-time exercise result submission from hardware devices

## 2. Entry Points

### Backend
- **Primary:** `src/server.js` - Express server on port 3010
- **App Logic:** `src/app.js` - Route handlers, middleware, database queries
- **API Spec:** `api/openapi.yaml` - OpenAPI 3.0 specification

### Frontend
- **Primary:** `src/main.jsx` - React app entry point
- **Root Component:** `src/App.jsx` - Router and authentication context
- **Dev Server:** Vite on port 3000 with proxy to backend

### Database
- **Schema:** `sql/schema.sql` - PostgreSQL table definitions, triggers, functions
- **Seed Data:** `sql/data.sql` - Initial users, relationships, messages
- **Orchestration:** `docker-compose.yml` - PostgreSQL container with auto-init

### CLI/Scripts
- `start.sh` - Full stack startup (install, database, backend, frontend)
- `PSQL.sh` - Direct PostgreSQL shell access
- `PortClear.sh` - Port cleanup utility
- `sync.sh` - Git commit and push automation

## 3. Dependency Surface

### Runtime Dependencies
- **Backend Framework:** express, cors, body-parser
- **API Validation:** express-openapi-validator, swagger-ui-express
- **Database:** pg (PostgreSQL client)
- **Authentication:** jsonwebtoken, bcrypt/bcryptjs
- **Config:** dotenv, js-yaml
- **Frontend:** react, react-dom, react-router-dom
- **UI Components:** @mui/material, @mui/icons-material
- **3D Rendering:** three, @react-three/fiber, @react-three/drei
- **Date Handling:** date-fns, react-datepicker

### Dev Dependencies
- **Build:** vite, @vitejs/plugin-react
- **Testing:** vitest, @vitest/coverage-v8, supertest, @testing-library/react, @testing-library/jest-dom
- **Linting:** eslint, eslint-config-google, eslint-plugin-react
- **Dev Server:** nodemon
- **Utilities:** bestzip, jsdom

**Critical Issue:** All dependencies use wildcard versions (`*`), preventing reproducible builds.

## 4. Configuration Surface

### Environment Variables (`.env.example` is incomplete)
Required but not documented:
- `JWT_SECRET` - JWT signing key
- `POSTGRES_HOST` - Database host (default: localhost)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password

### Static Configuration
- `vite.config.js` - Dev server port, proxy config, allowed hosts
- `docker-compose.yml` - Database container configuration
- `.eslintrc.json` - Linting rules
- `package.json` - Scripts: `front`, `back`, `build`, `lint`, `test`

## 5. Data Flow

```
IoT Device (ESP32-C3)
    ↓ POST /v0/results/{device_id} (with exercise data)
Backend (Express + PostgreSQL)
    ↓ Store in `results` table
    ↓ Link to `devices` → `patient_devices` → `patients`
Frontend (React)
    ↓ GET /v0/results/{device_id} (fetch results)
Doctor/Patient Dashboard
    ↓ View exercise completion, flexion data, reps
```

**User Authentication Flow:**
1. POST `/v0/login` with email/password
2. Server validates against `users.data` JSONB field
3. bcrypt password comparison
4. JWT issued with 30min expiration
5. JWT sent in `Authorization: Bearer <token>` for all protected routes
6. Middleware (`check`) validates JWT and attaches `req.user`

**Doctor-Patient Assignment:**
- Admins create doctors via POST `/v0/createdoctor/{admin_id}`
- Doctors create patients via POST `/v0/create/{doctor_id}`
- Junction table `doctor_patients` enforces one-to-one doctor-patient relationship
- Database trigger `enforce_message_permissions` validates messaging is only between assigned pairs

## 6. Determinism Risks

### High Risk
- **Wildcard Dependencies:** All npm packages use `*`, causing non-reproducible builds across environments
- **Missing Lockfile:** No `package-lock.json` or `yarn.lock` committed
- **Timestamp Generation:** Message and result timestamps use PostgreSQL `CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles'`, which is timezone-dependent
- **JWT Expiration:** 30-minute token expiration makes long-running sessions non-deterministic
- **UUID Generation:** `gen_random_uuid()` generates non-deterministic primary keys

### Medium Risk
- **Nodemon Auto-Restart:** Backend auto-restarts on file changes, causing state loss
- **Docker Container State:** Database state persists in Docker volume, not tracked in version control

### Low Risk
- **3D Model Rendering:** three.js rendering may vary slightly across GPU/browser implementations

## 7. Observability

### Logging
- Console errors in backend route handlers (`console.error`)
- No structured logging (no timestamps, levels, or request IDs)
- No access logs for HTTP requests
- Frontend has no error boundary or logging

### Error Handling
- Express global error handler returns JSON with `message`, `errors`, `status`
- Database errors caught and return generic "Internal Server Error"
- OpenAPI validator returns detailed validation errors
- No error tracking or monitoring integration

### Monitoring
- No metrics collection (latency, throughput, error rates)
- No health check endpoints
- Swagger UI at `/v0/api-docs/` provides manual API testing

## 8. Test State

### Test Infrastructure
- vitest configured with coverage (`npm test`)
- supertest for API testing
- @testing-library/react for component testing
- Coverage tool: @vitest/coverage-v8

### Existing Tests
**None.** No test files exist in the repository.

### Coverage
0% - No tests implemented

## 9. Reproducibility

### Blocking Issues
- **P0:** No package-lock.json, all dependencies use `*`
- **P0:** `.env.example` is empty, required variables undocumented
- **P1:** No instructions for non-Docker PostgreSQL setup
- **P1:** No seed data reset script (data.sql runs once on container init)

### Positive Factors
- Docker Compose ensures consistent PostgreSQL version and initialization
- SQL schema and seed data are version-controlled
- `start.sh` automates full stack startup
- `sync.sh` enforces commit discipline

## 10. Security Surface

### Authentication
- JWT with HS256 (symmetric signing)
- bcrypt password hashing (configurable rounds)
- 30-minute token expiration

### Secrets
- `JWT_SECRET` in environment (not version-controlled)
- Database credentials in environment
- `isrgrootx1.pem` (SSL certificate) committed to repo

### Authorization
- Role-based access control (admin, doctor, patient)
- Database-level enforcement via trigger `validate_message_permissions`
- Middleware checks JWT and attaches `req.user.role`

### Vulnerabilities
- **P0:** JWT secret must be strong and rotated periodically (no guidance provided)
- **P1:** No rate limiting on `/v0/login` (brute force risk)
- **P1:** No input sanitization beyond OpenAPI validation
- **P2:** CORS enabled for all origins (`cors()` with no config)
- **P2:** Device registration endpoint allows duplicate hardware_ids
- **P2:** No audit log for admin/doctor actions

## 11. Ranked Improvement List

### P0 (Blocking for Production)
1. Pin all npm dependencies to exact versions, commit package-lock.json
2. Document all required environment variables in `.env.example`
3. Add JWT secret generation script and rotation guidance
4. Implement rate limiting on authentication endpoints
5. Add HTTPS/TLS termination configuration

### P1 (High Priority)
1. Write integration tests for all API endpoints (target: 80% coverage)
2. Add React component tests for critical flows (login, messaging, device registration)
3. Implement structured logging with request IDs and log levels
4. Add health check endpoint (`/health`, `/readiness`)
5. Create database migration system (currently only supports fresh init)
6. Add error boundary in React app
7. Document API authentication flow and role permissions
8. Restrict CORS to known origins
9. Add unique constraint on `devices.hardware_id`
10. Implement session invalidation/logout

### P2 (Nice to Have)
1. Add metrics collection (Prometheus, StatsD)
2. Implement audit logging for sensitive operations
3. Add input sanitization beyond OpenAPI validation
4. Create E2E tests with device simulation
5. Add CSP headers
6. Implement refresh tokens (avoid 30min hard expiration)
7. Add database query optimization (indexes on foreign keys)
8. Document 3D model license and attribution
9. Add frontend build artifacts to `.gitignore` if not already present
10. Create `CONTRIBUTING.md` with commit message conventions
