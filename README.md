# TheraHand

Full-stack physical therapy management platform connecting healthcare providers and patients through IoT-enabled hand rehabilitation exercises.

## What It Does

- Role-based access control for admins, doctors, and patients
- Doctor-patient assignment and secure messaging
- Exercise prescription and tracking
- ESP32-C3 device registration and data collection
- Real-time exercise result submission from hardware
- 3D hand model visualization for exercise demonstration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (React)                      │
│  • Vite dev server (port 3000)                              │
│  • Material-UI components                                   │
│  • Three.js 3D hand model                                   │
│  • React Router for navigation                              │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST
                   │ JWT Bearer Auth
┌──────────────────▼──────────────────────────────────────────┐
│                    Backend (Express)                        │
│  • OpenAPI 3.0 validated endpoints (port 3010)              │
│  • JWT middleware (HS256, 30min expiration)                 │
│  • bcrypt password hashing                                  │
│  • Role-based authorization checks                          │
└──────────────────┬──────────────────────────────────────────┘
                   │ pg (PostgreSQL client)
┌──────────────────▼──────────────────────────────────────────┐
│                  Database (PostgreSQL)                      │
│  • Docker Compose managed                                   │
│  • JSONB for user data and exercise metadata                │
│  • Triggers enforce message permissions                     │
│  • Cascading deletes maintain referential integrity         │
└─────────────────────────────────────────────────────────────┘
                   ▲
                   │ HTTP POST
┌──────────────────┴──────────────────────────────────────────┐
│                  IoT Device (ESP32-C3)                      │
│  • Registers via hardware_id                                │
│  • Submits exercise results to /v0/results/{device_id}      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**Frontend**
- Authentication flow (login, JWT storage)
- Role-specific dashboards (admin, doctor, patient)
- Real-time messaging interface
- Exercise assignment creation (doctors only)
- Device registration forms (patients only)
- 3D hand model rendering with Three.js

**Backend**
- JWT issuance and validation
- OpenAPI request/response validation
- Database query execution
- Authorization enforcement (role checks, assignment validation)
- Error handling and logging

**Database**
- User credentials (hashed passwords in JSONB)
- Doctor-patient relationships (junction table)
- Message history with sender/recipient validation trigger
- Device registry linked to patients
- Exercise assignments (JSONB metadata: name, finger, flexion, reps)
- Exercise results (JSONB data from devices)

**ESP32C3**
- Submits hardware_id for registration
- Posts exercise completion data (finger, flexion, reps achieved)

## Evaluation

### Correctness Criteria

**Authentication**
- Login with valid credentials returns JWT with correct role
- Login with invalid credentials returns 401
- Protected endpoints reject requests without valid JWT

**Authorization**
- Patients can only view their own data and assigned doctor
- Doctors can only access patients assigned to them
- Admins can create doctors; doctors can create patients

**Data Integrity**
- Deleting a doctor cascades to their patients and all messages
- Message insertion fails if patient is not assigned to recipient doctor
- Device registration requires valid patient_id

**Exercise Flow**
- Doctor creates assignment for patient
- Patient registers device via hardware_id
- Device posts results to correct device_id
- Results are retrievable by patient and assigned doctor

## Demo

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- PostgreSQL client (optional, for manual inspection)

### Environment Setup

Create `.env` file with required variables or use the one provided:

```bash
JWT_SECRET=your-secure-random-string-here
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=therahand
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-db-password
```

### Running the Application

```bash
# Full stack startup (installs dependencies, starts database, backend, frontend)
./start.sh
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3010/v0
- API Documentation: http://localhost:3010/v0/api-docs/

### Expected Behavior

1. Login as doctor at http://localhost:3000/login
2. View assigned patients on home dashboard
3. Click patient name to open messaging interface
4. Send message to patient
5. Navigate to exercise assignment tab
6. Create new exercise assignment (finger, flexion target, reps)
7. Logout and login as patient
8. View assigned exercises
9. Register device via hardware_id
10. (Device simulation) POST result to `/v0/results/{device_id}` with exercise data
11. View exercise history in patient dashboard

## Repository Layout

```
TheraHand_app/
├── api/
│   └── openapi.yaml          # OpenAPI 3.0 specification
├── sql/
│   ├── schema.sql            # PostgreSQL schema with triggers
│   └── data.sql              # Seed data (users, relationships, messages)
├── src/
│   ├── app.js                # Express app, routes, middleware
│   ├── server.js             # Server entry point
│   ├── App.jsx               # React root component with router
│   ├── main.jsx              # React app entry point
│   ├── SignIn.jsx            # Login form
│   ├── Home.jsx              # Main dashboard (role-specific)
│   ├── Admin.jsx             # Admin interface
│   ├── CreateUser.jsx        # Patient/doctor creation forms
│   ├── AddDevice.jsx         # Device registration form
│   ├── HandModel.jsx         # Three.js 3D hand model
│   ├── ProtectedRoute.jsx    # Route guard for authenticated pages
│   └── App.css               # Global styles
├── public/
│   ├── therahand.png         # Favicon
│   └── rigged_hand/          # 3D model assets (GLTF)
├── scripts/
│   └── demo.sh               # Automated demo verification script
├── docker-compose.yml        # PostgreSQL container definition
├── package.json              # Node dependencies and scripts
├── vite.config.js            # Vite dev server and proxy config
├── .eslintrc.json            # ESLint configuration
├── start.sh                  # Full stack startup script
├── PortClear.sh              # Port cleanup utility
├── PSQL.sh                   # PostgreSQL shell access
└── README.md                 # This file
```
