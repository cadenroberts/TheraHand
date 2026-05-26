# Demo Instructions

This document provides step-by-step instructions for demonstrating TheraHand's core functionality.

## Prerequisites

**Required Software**
- Node.js 18 or higher
- npm 9 or higher
- Docker 20.10 or higher
- Docker Compose 2.0 or higher

**Verification Commands**
```bash
node --version   # Should show v18.x or higher
npm --version    # Should show 9.x or higher
docker --version # Should show 20.10.x or higher
docker compose version # Should show 2.x or higher
```

**System Resources**
- 2GB free RAM (for PostgreSQL container)
- 500MB free disk space
- Ports 3000, 3010, 5432 available

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/cadenroberts/TheraHand_app.git
cd TheraHand_app
```

### 2. Create Environment File

```bash
cp .env.example .env
```

Edit `.env` with the following values:

```bash
JWT_SECRET=demo-secret-change-in-production
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=therahand
POSTGRES_USER=postgres
POSTGRES_PASSWORD=demo-password
```

**Important:** Use a strong random string for `JWT_SECRET` in production.

### 3. Start Services

```bash
./start.sh
```

This script will:
1. Install npm dependencies (~2 minutes first time)
2. Start PostgreSQL container (~10 seconds)
3. Initialize database with schema and seed data (~5 seconds)
4. Start backend server on port 3010 (~3 seconds)
5. Start frontend dev server on port 3000 (~5 seconds)

**Expected Output:**
```
Installing dependencies...
added 1247 packages, and audited 1248 packages in 2m

Starting Docker containers...
[+] Running 1/1
 ✔ Container thera-hand-backend  Started

Starting backend server...
Server Running on port 3010
API Testing UI: http://localhost:3010/v0/api-docs/

Starting frontend...
VITE v4.x.x  ready in 1234 ms

➜  Local:   http://localhost:3000/
```

### 4. Verify Services

Open three tabs in your browser:

1. **Frontend:** http://localhost:3000
   - Should show login page
2. **API Docs:** http://localhost:3010/v0/api-docs/
   - Should show Swagger UI with all endpoints
3. **Health Check:** http://localhost:3010/v0/runner
   - Should return `[]` (empty array)

---

## Demo Scenario 1: Doctor Creates Patient and Assigns Exercise

### Step 1: Login as Doctor

1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: `dr.harrison@therahand.com`
   - Password: `doctor`
3. Click **Sign In**

**Expected:** Redirect to `/home` with doctor dashboard showing "Patients" list

### Step 2: View Assigned Patients

**Expected:** Dashboard shows two patients:
- Aliyaa
- Ethan

### Step 3: Create New Patient

1. Click **Create Patient** button (or navigate to `/create`)
2. Fill form:
   - Email: `demo-patient@therahand.com`
   - Password: `patient123`
   - Name: `Demo Patient`
3. Click **Create**

**Expected:**
- Success message or redirect to patient list
- New patient appears in "Patients" list

### Step 4: Send Message to Patient

1. Click on **Demo Patient** in patient list
2. Navigate to **Messages** tab
3. Type message: "Welcome! Please complete the finger exercises I assigned."
4. Click **Send**

**Expected:**
- Message appears in message thread
- Timestamp shows current time

### Step 5: Create Exercise Assignment

1. While viewing Demo Patient's profile, navigate to **Assignments** tab
2. Click **Create Assignment**
3. Fill form:
   - Exercise Name: `Index Finger Flexion`
   - Finger: `Index`
   - Flexion Target: `90` (degrees)
   - Reps: `15`
4. Click **Save**

**Expected:**
- Assignment appears in patient's assignment list
- Shows: "Index Finger Flexion - Index finger, 90°, 15 reps"

### Step 6: Logout

1. Click profile icon (top right)
2. Click **Logout**

**Expected:** Redirect to `/login`

---

## Demo Scenario 2: Patient Registers Device and Views Results

### Step 1: Login as Patient

1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: `demo-patient@therahand.com`
   - Password: `patient123`
3. Click **Sign In**

**Expected:** Redirect to `/home` with patient dashboard

### Step 2: View Assigned Doctor

**Expected:** Dashboard shows:
- Doctor Name: Dr. Harrison
- Email: dr.harrison@therahand.com

### Step 3: View Messages

1. Navigate to **Messages** tab

**Expected:**
- Message from Dr. Harrison: "Welcome! Please complete the finger exercises I assigned."
- Timestamp matches when message was sent

### Step 4: Send Reply

1. Type message: "Thank you, Dr. Harrison! I will start today."
2. Click **Send**

**Expected:**
- Reply appears in message thread below doctor's message

### Step 5: View Exercise Assignments

1. Navigate to **Assignments** or **Exercises** tab

**Expected:**
- Shows: "Index Finger Flexion - Index finger, 90°, 15 reps"

### Step 6: Register Device

1. Navigate to **Devices** or `/device`
2. Enter hardware ID: `ESP32-DEMO-001`
3. Click **Register Device**

**Expected:**
- Success message: "Device registered successfully"
- Device appears in device list with ID

### Step 7: View Exercise Results (Initially Empty)

1. Click on registered device in device list
2. Navigate to **Results** or **History** tab

**Expected:**
- Empty state: "No results yet"

---

## Demo Scenario 3: Simulate Device Submitting Results

### Step 1: Capture Device ID

From the patient's device list, note the `device_id` (UUID format, e.g., `a3f2c7d1-...`)

Alternatively, query via API:

```bash
curl http://localhost:3010/v0/devices/search/ESP32-DEMO-001 \
  -H "Authorization: Bearer <patient_jwt_token>"
```

Response:
```json
{
  "id": "a3f2c7d1-1234-5678-90ab-cdef12345678",
  "hardware_id": "ESP32-DEMO-001"
}
```

### Step 2: Submit Result via API (Simulating Device)

```bash
DEVICE_ID="a3f2c7d1-1234-5678-90ab-cdef12345678"  # Use actual ID from Step 1

curl -X POST http://localhost:3010/v0/results/$DEVICE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "finger": "Index",
      "flexion_achieved": 88,
      "reps_completed": 15,
      "duration_seconds": 45,
      "timestamp": "2024-12-10T14:30:00Z"
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Result recorded",
  "result": {
    "id": "b4e3d8f2-...",
    "created_at": "2024-12-10T14:30:05.123Z"
  }
}
```

### Step 3: View Results in Patient Dashboard

1. Return to patient dashboard in browser
2. Refresh page or navigate to **Results** tab

**Expected:**
- Result appears in history:
  - Finger: Index
  - Flexion Achieved: 88°
  - Reps Completed: 15
  - Duration: 45s
  - Timestamp: Dec 10, 2024 2:30 PM

### Step 4: Submit Multiple Results

Repeat Step 2 with different values:

```bash
curl -X POST http://localhost:3010/v0/results/$DEVICE_ID \
  -H "Content-Type: application/json" \
  -d '{"data": {"finger": "Index", "flexion_achieved": 90, "reps_completed": 15}}'

curl -X POST http://localhost:3010/v0/results/$DEVICE_ID \
  -H "Content-Type: application/json" \
  -d '{"data": {"finger": "Index", "flexion_achieved": 92, "reps_completed": 16}}'
```

**Expected:** Results list shows all three submissions, sorted by timestamp (newest first)

---

## Demo Scenario 4: Doctor Views Patient Progress

### Step 1: Logout from Patient Account

1. Click profile icon → **Logout**

### Step 2: Login as Doctor

1. Navigate to http://localhost:3000/login
2. Enter credentials:
   - Email: `dr.harrison@therahand.com`
   - Password: `doctor`

### Step 3: View Patient Messages

1. Click **Demo Patient** in patient list
2. Navigate to **Messages** tab

**Expected:**
- Thread shows doctor's message and patient's reply
- Timestamps in chronological order

### Step 4: View Patient Exercise Results

1. While viewing Demo Patient's profile
2. Navigate to **Devices** or **Results** tab
3. Click on device `ESP32-DEMO-001`

**Expected:**
- Shows all three results submitted by device
- Doctor can see patient's progress (flexion improved from 88° to 92°)

### Step 5: Send Encouragement

1. Navigate to **Messages** tab
2. Type: "Great progress! Your flexion improved by 4 degrees. Keep it up!"
3. Click **Send**

**Expected:**
- Message appears in thread
- Patient will see this message on next login

---

## Demo Scenario 5: Admin Manages Doctors

### Step 1: Logout and Login as Admin

1. Logout from doctor account
2. Login with:
   - Email: `a@admin.com`
   - Password: `admin`

**Expected:** Redirect to `/admin` (admin dashboard)

### Step 2: View All Doctors

**Expected:** Dashboard shows list of doctors:
- Dr. Harrison (dr.harrison@therahand.com)
- Dr. Lu (dr.lu@therahand.com)

### Step 3: Create New Doctor

1. Click **Create Doctor** button
2. Fill form:
   - Email: `dr.smith@therahand.com`
   - Password: `doctor123`
   - Name: `Dr. Smith`
3. Click **Create**

**Expected:**
- Success message
- Dr. Smith appears in doctors list

### Step 4: Verify New Doctor Can Login

1. Logout from admin account
2. Login as Dr. Smith:
   - Email: `dr.smith@therahand.com`
   - Password: `doctor123`

**Expected:**
- Login succeeds
- Doctor dashboard shows empty patient list (no patients assigned yet)

---

## Troubleshooting

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3010`

**Solution:**
```bash
./PortClear.sh  # Kills processes on ports 3010 and 3000
./start.sh      # Restart services
```

### Database Connection Failed

**Symptom:** Backend logs show `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution:**
```bash
docker compose down
docker compose up -d
sleep 10  # Wait for PostgreSQL initialization
npm run back &
```

### Frontend Shows Blank Page

**Symptom:** Browser shows white screen, console shows errors

**Solution:**
1. Check backend is running: `curl http://localhost:3010/v0/runner`
2. Check Vite proxy config: `cat vite.config.js`
3. Restart frontend: `npm run front`

### JWT Token Expired

**Symptom:** 403 Forbidden on API requests after 30 minutes

**Solution:**
- Refresh page and login again
- Tokens expire after 30 minutes (by design)

### Cannot Submit Device Results

**Symptom:** `404 Not Found` on `/v0/results/{device_id}`

**Solution:**
- Verify device_id is correct (UUID format)
- Check device exists: `curl http://localhost:3010/v0/devices/search/<hardware_id>`
- Ensure endpoint uses POST, not GET

### Database Data Reset

**To reset database to seed data:**
```bash
docker compose down -v  # Remove volumes
docker compose up -d    # Reinitialize with schema.sql and data.sql
```

**Warning:** This deletes all data including demo patient and results.

---

## Full Demo Path (Smoke Test)

For a quick end-to-end verification:

```bash
# 1. Start services
./start.sh

# 2. Login as doctor (via curl)
TOKEN=$(curl -s -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.harrison@therahand.com", "password": "doctor"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 3. Verify doctor can access home
curl -s http://localhost:3010/v0/home \
  -H "Authorization: Bearer $TOKEN" | grep -q "id" && echo "✓ Doctor auth works"

# 4. Get doctor's patients
curl -s http://localhost:3010/v0/home/$(curl -s -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "dr.harrison@therahand.com", "password": "doctor"}' \
  | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4) \
  -H "Authorization: Bearer $TOKEN" | grep -q "aliyaa" && echo "✓ Doctor sees patients"

# 5. Login as patient
PATIENT_TOKEN=$(curl -s -X POST http://localhost:3010/v0/login \
  -H "Content-Type: application/json" \
  -d '{"email": "aliyaa@therahand.com", "password": "patient"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 6. Verify patient auth
curl -s http://localhost:3010/v0/home \
  -H "Authorization: Bearer $PATIENT_TOKEN" | grep -q "id" && echo "✓ Patient auth works"

echo "Demo smoke test complete!"
```

**Expected:** All checks print `✓` and final message shows "Demo smoke test complete!"

---

## Limitations

**Not Demonstrated in This Demo:**

1. **Real ESP32-C3 Integration:** Demo uses curl to simulate device; actual firmware not included
2. **3D Hand Model Interaction:** Demo focuses on data flow; 3D model rendering requires browser inspection
3. **Performance Testing:** Demo does not stress test concurrent users or large datasets
4. **Error Recovery:** Demo assumes happy path; edge cases (network failures, invalid data) not covered
5. **Mobile Responsiveness:** Demo uses desktop browser; mobile layout not explicitly tested
6. **Accessibility:** Demo does not verify screen reader compatibility or keyboard navigation

**Production Deployment:** This demo runs locally with Docker. Production deployment requires:
- HTTPS/TLS termination
- Environment secrets management
- Database backups and migrations
- Monitoring and alerting
- Rate limiting and DDoS protection
