# Architecture

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌────────────────────┐              ┌────────────────────┐      │
│  │   Browser (React)  │              │  ESP32-C3 Device   │      │
│  │  • JWT storage     │              │  • Hardware ID     │      │
│  │  • Role-based UI   │              │  • Sensor data     │      │
│  │  • 3D rendering    │              │  • HTTP client     │      │
│  └─────────┬──────────┘              └─────────┬──────────┘      │
└────────────┼───────────────────────────────────┼─────────────────┘
             │                                   │
             │ HTTPS (JWT Bearer)                │ HTTP POST
             │                                   │
┌────────────▼───────────────────────────────────▼──────────────────┐
│                        API Gateway                                │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │              Express Server (port 3010)                   │    │
│  │  • OpenAPI Validator Middleware                           │    │
│  │  • CORS Middleware                                        │    │
│  │  • JWT Authentication Middleware (check)                  │    │
│  │  • Route Handlers (login, messages, assignments, etc.)    │    │
│  │  • Global Error Handler                                   │    │
│  └───────────────────────┬───────────────────────────────────┘    │
└──────────────────────────┼────────────────────────────────────────┘
                           │
                           │ pg (connection pool)
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                       Data Layer                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              PostgreSQL Database                          │   │
│  │                                                            │   │
│  │  Tables:                                                   │   │
│  │  • users (role TEXT, data JSONB)                          │   │
│  │  • doctors, patients, admins (references users.id)        │   │
│  │  • doctor_patients (junction, enforces 1:1)               │   │
│  │  • messages (with permission trigger)                     │   │
│  │  • devices (hardware_id TEXT)                             │   │
│  │  • patient_devices (junction)                             │   │
│  │  • assignments (patient_id, data JSONB)                   │   │
│  │  • results (device_id, data JSONB)                        │   │
│  │  • runner (device_id, data JSONB)                         │   │
│  │                                                            │   │
│  │  Triggers:                                                 │   │
│  │  • validate_message_permissions() on messages INSERT      │   │
│  │                                                            │   │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Execution Flow

### User Authentication

```
1. User → POST /v0/login {email, password}
2. Backend → Query users table by email (data->>'email')
3. Backend → bcrypt.compare(password, user.data.password)
4. Backend → jwt.sign({id, role}, JWT_SECRET, {expiresIn: '30m'})
5. Backend → Return {id, role, email, name, accessToken}
6. Client → Store JWT in localStorage
7. Client → Attach JWT to all subsequent requests in Authorization header
```

### Protected Endpoint Access

```
1. Client → GET /v0/home (with Authorization: Bearer <token>)
2. Middleware → Extract token from Authorization header
3. Middleware → jwt.verify(token, JWT_SECRET)
4. Middleware → Attach {id, role} to req.user
5. Route Handler → Query database using req.user.id and req.user.role
6. Route Handler → Apply role-based filtering (e.g., doctor sees only assigned patients)
7. Backend → Return filtered data
```

### Doctor Creates Patient

```
1. Doctor → POST /v0/create/{doctor_id} {email, password, name}
2. Middleware → Verify JWT, attach req.user
3. Handler → Validate req.user.role === 'doctor' && req.user.id === doctor_id
4. Handler → Check email uniqueness in users table
5. Handler → bcrypt.hash(password, 10)
6. Handler → INSERT INTO users (role='patient', data={email, name, hashed_password})
7. Handler → INSERT INTO patients (id=new_user_id)
8. Handler → INSERT INTO doctor_patients (doctor_id, patient_id)
9. Backend → Return {id, email, name}
```

### Messaging Between Doctor and Patient

```
1. Sender → POST /v0/sendmessage/{patient_id} {content}
2. Middleware → Verify JWT, attach req.user (sender)
3. Handler → Determine recipient_id based on sender role:
   - If sender is doctor: recipient = patient_id (must be assigned)
   - If sender is patient: recipient = assigned doctor (lookup via doctor_patients)
4. Handler → INSERT INTO messages (sender_id, recipient_id, content)
5. Trigger → validate_message_permissions() executes BEFORE INSERT
6. Trigger → Verify sender_role and recipient_role compatibility
7. Trigger → If patient sending to doctor, verify assignment in doctor_patients
8. Trigger → RAISE EXCEPTION if invalid, else RETURN NEW
9. Backend → Return {id, sent_at}
```

### Device Registration and Exercise Results

```
1. Patient → POST /v0/device/{patient_id} {hardware_id}
2. Middleware → Verify JWT, req.user.id === patient_id
3. Handler → INSERT INTO devices (hardware_id) RETURNING id
4. Handler → INSERT INTO patient_devices (patient_id, device_id)
5. Backend → Return {device_id}

6. ESP32-C3 → POST /v0/results/{device_id} {data: {finger, flexion, reps}}
7. Handler → INSERT INTO results (device_id, data, created_at)
8. Backend → Return {id, created_at}

9. Patient/Doctor → GET /v0/results/{device_id}
10. Handler → SELECT * FROM results WHERE device_id = $1 ORDER BY created_at DESC
11. Backend → Return [{id, data, created_at}, ...]
```

## Contracts Between Components

### Frontend → Backend

**Authentication Contract**
- Request: `POST /v0/login` with `{email: string, password: string}`
- Success: `200 OK` with `{id: uuid, role: string, email: string, name: string, accessToken: string}`
- Failure: `401 Unauthorized` for invalid credentials

**Authorization Contract**
- All protected endpoints require `Authorization: Bearer <jwt>` header
- Missing/invalid token → `401 Unauthorized`
- Valid token but insufficient permissions → `403 Forbidden`

**Data Format Contract**
- All timestamps in ISO 8601 format
- All IDs are UUIDs
- JSONB fields (user data, assignments, results) have flexible schemas but frontend expects specific keys

### Backend → Database

**User Storage Contract**
- User credentials stored in `users.data` JSONB with keys: `email`, `name`, `password` (hashed)
- Role stored in `users.role` TEXT field (enum: 'admin', 'doctor', 'patient')
- Specialized tables (doctors, patients, admins) reference `users.id` with CASCADE delete

**Message Validation Contract**
- All message inserts trigger `validate_message_permissions()`
- Trigger enforces: doctor → patient OR patient → assigned doctor
- Invalid message direction raises exception, causing handler to return 500

**Assignment and Result Contract**
- Assignments: `{patient_id: uuid, data: {name, finger, flexion, reps}}`
- Results: `{device_id: uuid, data: {arbitrary JSON from device}}`
- No schema validation at database level; validation is application responsibility

### Device → Backend

**Registration Contract**
- Device must POST hardware_id (e.g., MAC address or chip ID) to `/v0/device/{patient_id}`
- Backend returns device_id (UUID) for use in future result submissions
- No authentication required (risk: any device can register to any patient if patient_id is known)

**Result Submission Contract**
- Device POSTs to `/v0/results/{device_id}` with `{data: object}`
- No authentication required (endpoint at line 805 of app.js has no `check` middleware)
- Backend accepts arbitrary JSON in `data` field

## Failure Modes

### Authentication Failures

**JWT Expiration**
- Symptom: 403 Forbidden on protected endpoints after 30 minutes
- Impact: User must re-authenticate
- Mitigation: Frontend redirects to login, user re-enters credentials

**Invalid JWT**
- Symptom: 403 Forbidden on protected endpoints
- Cause: Tampered token or JWT_SECRET mismatch
- Impact: User cannot access protected resources
- Mitigation: Frontend clears localStorage, redirects to login

### Authorization Failures

**Patient Accessing Another Patient's Data**
- Symptom: 403 Forbidden
- Cause: Authorization checks validate req.user.id matches patient_id in route
- Impact: Unauthorized access prevented

**Doctor Accessing Non-Assigned Patient**
- Symptom: 403 Forbidden or empty result set
- Cause: Queries filter by `doctor_patients.doctor_id = req.user.id`
- Impact: Cross-patient data leakage prevented

### Database Failures

**Message Permission Violation**
- Symptom: 500 Internal Server Error
- Cause: `validate_message_permissions()` raises exception for invalid sender-recipient pair
- Impact: Message not inserted, error logged
- Mitigation: Frontend should prevent invalid message attempts (e.g., patient cannot message other patients)

**Cascading Deletes**
- Symptom: Deleting doctor removes all assigned patients and their messages
- Cause: `ON DELETE CASCADE` on doctor_patients and patients references
- Impact: Data loss if not intentional
- Mitigation: Admin interface should confirm deletion with warning

**Connection Pool Exhaustion**
- Symptom: Database queries hang or fail with "connection timeout"
- Cause: All connections in `pg.Pool` are in use (default 10)
- Impact: Backend cannot serve requests
- Mitigation: Restart backend, increase pool size, investigate connection leaks

### Device Failures

**Duplicate Hardware ID Registration**
- Symptom: Database constraint violation (if unique constraint added) or duplicate devices created
- Current Behavior: Inserts duplicate device rows (no unique constraint on hardware_id)
- Impact: Multiple device_ids for same physical device
- Mitigation: Add unique constraint, catch error in handler, return existing device_id

**Device POSTing to Wrong Device ID**
- Symptom: Results attributed to wrong patient
- Cause: Device uses incorrect device_id in URL path
- Impact: Data integrity violation
- Mitigation: No current mitigation; device must store device_id correctly

### Frontend Failures

**Network Disconnection**
- Symptom: Fetch requests fail with network error
- Impact: UI shows stale data, user cannot interact
- Mitigation: No retry logic; user must refresh page

**Stale JWT**
- Symptom: 403 Forbidden after token expiration
- Impact: User loses unsaved work
- Mitigation: Frontend should detect 403, clear auth state, redirect to login

## Observability

### Logging

**Backend Logs**
- Server startup: `Server Running on port 3010`
- Errors: `console.error('Error in <handler>:', err)`
- No request IDs, timestamps, or log levels

**Database Logs**
- Trigger exceptions: `RAISE EXCEPTION '<message>'` (visible in PostgreSQL logs)
- Docker Compose stdout (if containers run in attached mode)

**Frontend Logs**
- No structured logging
- Browser console errors for network failures and React rendering errors

### Monitoring Endpoints

**None.** The application has no health check, readiness, or metrics endpoints.

### Debugging

**API Explorer**
- Swagger UI at http://localhost:3010/v0/api-docs/
- Allows manual endpoint testing without frontend

**Database Inspection**
```bash
./PSQL.sh  # Opens psql shell to therahand database
SELECT * FROM users;
SELECT * FROM doctor_patients;
SELECT * FROM messages;
```

**Token Debugging**
- Decode JWT at jwt.io to inspect payload and expiration
- Verify `JWT_SECRET` matches between `.env` and token signature

### Error Recovery

**Restart Services**
```bash
docker compose down
docker compose up -d
# Wait for PostgreSQL initialization
npm run back &
npm run front
```

**Reset Database**
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Reinitialize with schema.sql and data.sql
```

**Clear Frontend State**
- Open browser console
- Execute: `localStorage.clear()`
- Refresh page
