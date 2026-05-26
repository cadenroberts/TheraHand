# Evaluation

This document defines correctness criteria, test strategies, and verification procedures for TheraHand.

## Correctness Definition

TheraHand is correct if:

1. **Authentication:** Only valid credentials grant access; tokens enforce time-limited sessions
2. **Authorization:** Users can only access data within their role permissions
3. **Data Integrity:** Doctor-patient relationships are enforced; message permissions are validated
4. **Exercise Flow:** Assignments, device registration, and results follow proper sequence and validation
5. **Error Handling:** Invalid inputs return appropriate HTTP status codes and error messages

---

## Test Plan

### Unit Tests

**Authentication Functions**

```javascript
// Test: login with valid credentials
POST /v0/login { email: "dr.harrison@therahand.com", password: "doctor" }
Expected: 200 OK with JWT, id, role="doctor", email, name

// Test: login with invalid password
POST /v0/login { email: "dr.harrison@therahand.com", password: "wrong" }
Expected: 401 Unauthorized

// Test: login with nonexistent email
POST /v0/login { email: "nobody@test.com", password: "anything" }
Expected: 401 Unauthorized

// Test: login with missing fields
POST /v0/login { email: "test@test.com" }
Expected: 400 Bad Request
```

**JWT Middleware**

```javascript
// Test: access protected endpoint without token
GET /v0/home
Expected: 401 Unauthorized

// Test: access protected endpoint with expired token
GET /v0/home (Authorization: Bearer <expired_token>)
Expected: 403 Forbidden

// Test: access protected endpoint with invalid token
GET /v0/home (Authorization: Bearer invalid.token.here)
Expected: 403 Forbidden

// Test: access protected endpoint with valid token
GET /v0/home (Authorization: Bearer <valid_token>)
Expected: 200 OK with data
```

**Password Hashing**

```javascript
// Test: bcrypt.hash produces different hashes for same password
hash1 = bcrypt.hash("password", 10)
hash2 = bcrypt.hash("password", 10)
Expected: hash1 !== hash2 (salt is random)

// Test: bcrypt.compare succeeds with correct password
hashed = bcrypt.hash("password", 10)
result = bcrypt.compare("password", hashed)
Expected: result === true

// Test: bcrypt.compare fails with incorrect password
hashed = bcrypt.hash("password", 10)
result = bcrypt.compare("wrong", hashed)
Expected: result === false
```

---

### Integration Tests

**Doctor-Patient Assignment**

```javascript
// Test: admin creates doctor
POST /v0/createdoctor/{admin_id} { email: "new@doc.com", password: "pass", name: "New Doc" }
  (Authorization: Bearer <admin_token>)
Expected: 201 Created with {id, email, name}

// Test: doctor creates patient
POST /v0/create/{doctor_id} { email: "new@patient.com", password: "pass", name: "New Patient" }
  (Authorization: Bearer <doctor_token>)
Expected: 201 Created with {id, email, name}
Database Check: SELECT * FROM doctor_patients WHERE doctor_id = ... AND patient_id = ...
Expected: One row exists

// Test: patient cannot access other patient's data
GET /v0/home (Authorization: Bearer <patient1_token>)
Expected: Only patient1's assignments and messages, not patient2's
```

**Messaging Validation**

```javascript
// Test: doctor sends message to assigned patient
POST /v0/sendmessage/{patient_id} { content: "Test message" }
  (Authorization: Bearer <doctor_token>, patient is assigned to doctor)
Expected: 201 Created with {id, sent_at}

// Test: doctor sends message to unassigned patient
POST /v0/sendmessage/{patient_id} { content: "Test message" }
  (Authorization: Bearer <doctor_token>, patient NOT assigned to doctor)
Expected: 403 Forbidden

// Test: patient sends message to assigned doctor
POST /v0/sendmessage/{patient_id} { content: "Test message" }
  (Authorization: Bearer <patient_token>, patient is self)
Expected: 201 Created (message goes to assigned doctor)

// Test: patient sends message to unassigned doctor (via trigger)
Direct SQL: INSERT INTO messages (sender_id, recipient_id, content)
  VALUES (<patient_id>, <unassigned_doctor_id>, 'Test')
Expected: Exception raised by validate_message_permissions() trigger
```

**Device Registration and Results**

```javascript
// Test: patient registers device
POST /v0/device/{patient_id} { hardware_id: "ESP32-TEST-001" }
  (Authorization: Bearer <patient_token>)
Expected: 200 OK with {device_id}
Database Check: SELECT * FROM devices WHERE hardware_id = 'ESP32-TEST-001'
Expected: One row with returned device_id

// Test: device submits result
POST /v0/results/{device_id} { data: { finger: "index", flexion: 85, reps: 10 } }
Expected: 201 Created with {id, created_at}

// Test: patient retrieves results
GET /v0/results/{device_id} (Authorization: Bearer <patient_token>)
Expected: 200 OK with array of results, including recently submitted data

// Test: doctor retrieves patient's results
GET /v0/results/{device_id} (Authorization: Bearer <doctor_token>, device belongs to assigned patient)
Expected: 200 OK with results
```

---

### End-to-End Tests

**Full User Journey: Doctor**

1. Admin logs in and creates doctor account
2. Doctor logs in with new credentials
3. Doctor creates patient account
4. Doctor sends message to patient
5. Doctor creates exercise assignment for patient
6. Doctor views patient's devices (should be empty initially)
7. Doctor views patient's results (should be empty initially)
8. Doctor logs out

**Full User Journey: Patient**

1. Patient logs in
2. Patient views assigned doctor
3. Patient views messages from doctor
4. Patient sends reply to doctor
5. Patient registers device via hardware_id
6. Device submits exercise result
7. Patient views result history
8. Patient logs out

**Data Integrity Journey**

1. Admin creates Doctor A with Patient 1
2. Admin creates Doctor B with Patient 2
3. Patient 1 sends message (should route to Doctor A, not Doctor B)
4. Doctor B attempts to access Patient 1's data (should fail with 403)
5. Admin deletes Doctor A
6. Database Check: Patient 1 and associated messages are cascade-deleted
7. Patient 1 cannot log in (user no longer exists)

---

## Pass/Fail Criteria

### Authentication Module

**Pass if:**
- All login tests return correct status codes and response bodies
- JWT middleware correctly rejects missing, invalid, and expired tokens
- bcrypt hashing is non-deterministic and comparison works correctly

**Fail if:**
- Login succeeds with incorrect password
- Expired tokens grant access to protected endpoints
- Same password produces same hash (no salt)

### Authorization Module

**Pass if:**
- Patients can only access their own data and assigned doctor
- Doctors can only access patients assigned to them
- Admins can create doctors; doctors can create patients
- Role checks prevent privilege escalation

**Fail if:**
- Patient can view another patient's messages or results
- Doctor can access unassigned patient's data
- Patient can create doctors

### Data Integrity Module

**Pass if:**
- Database trigger prevents invalid message directions
- Cascading deletes remove all related data
- Doctor-patient relationships are enforced at database level

**Fail if:**
- Messages can be inserted between unrelated users
- Deleting doctor leaves orphaned patients
- Multiple doctors can be assigned to same patient

### Exercise Flow Module

**Pass if:**
- Device registration returns device_id
- Result submission stores data with correct device_id
- Results are retrievable by patient and assigned doctor
- Assignments are created and fetched correctly

**Fail if:**
- Device registration fails with valid input
- Results are attributed to wrong device or patient
- Doctor cannot view patient's results
- Assignments are lost or corrupted

### Error Handling Module

**Pass if:**
- Missing required fields return 400 Bad Request
- Unauthorized requests return 401 Unauthorized
- Forbidden requests return 403 Forbidden
- Not found resources return 404 Not Found
- Server errors return 500 Internal Server Error with generic message

**Fail if:**
- Validation errors return 200 OK
- 500 errors expose sensitive information (database queries, stack traces)
- Error messages reveal user enumeration (e.g., "email exists" vs "invalid credentials")

---

## Verification Commands

### Run All Tests

```bash
npm test
```

Expected: All test suites pass (0% coverage currently, target 80%)

### Run Tests with Coverage

```bash
npm test -- --coverage
```

Expected:
- Statements: ≥80%
- Branches: ≥80%
- Functions: ≥80%
- Lines: ≥80%

### Lint Codebase

```bash
npm run lint
```

Expected: 0 errors, 0 warnings (enforced by `--max-warnings 0`)

### Manual API Testing

```bash
# Start services
./start.sh

# Open Swagger UI
open http://localhost:3010/v0/api-docs/

# Test login
curl -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.harrison@therahand.com", "password": "doctor"}'

# Capture token from response
TOKEN="<token_from_response>"

# Test protected endpoint
curl http://localhost:3010/v0/home \
  -H "Authorization: Bearer $TOKEN"

# Test unauthorized access
curl http://localhost:3010/v0/home
# Expected: 401 Unauthorized
```

---

## Performance Expectations

While correctness is primary, the following performance targets guide optimization:

**Response Time**
- Login endpoint: <200ms (p95)
- Query endpoints (messages, patients): <100ms (p95)
- Insert endpoints (create user, send message): <150ms (p95)

**Throughput**
- Backend should handle 100 concurrent requests without errors
- Database connection pool should support 50 active connections

**Scalability**
- Horizontal scaling: Backend is stateless (JWT auth), can run multiple instances behind load balancer
- Database scaling: Single PostgreSQL instance; sharding not currently supported

**Current Status:** No performance benchmarks exist. Manual testing suggests adequate performance for <100 users.

---

## Test Implementation Status

**Current:** 0% coverage, no test files exist

**Infrastructure:**
- vitest configured in `package.json`
- supertest available for API testing
- @testing-library/react available for component testing
- Coverage tool: @vitest/coverage-v8

**Next Steps:**

1. Create `src/__tests__/auth.test.js` for authentication unit tests
2. Create `src/__tests__/api.test.js` for endpoint integration tests
3. Create `src/__tests__/components/` for React component tests
4. Run `npm test` and achieve 80% coverage
5. Add CI pipeline to run tests on every commit (see `.github/workflows/ci.yml`)

---

## Continuous Integration

Once tests are implemented, the CI pipeline (`.github/workflows/ci.yml`) will:

1. Install dependencies
2. Run linter (`npm run lint`)
3. Run tests with coverage (`npm test -- --coverage`)
4. Fail build if coverage drops below 80%
5. Run demo script (`scripts/demo.sh`) to verify end-to-end functionality

**Expected CI Duration:** <5 minutes
