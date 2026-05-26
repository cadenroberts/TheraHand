// Import modules using ES Module syntax
import express from 'express';
import cors from 'cors';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenApiValidator from 'express-openapi-validator';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secret = process.env.JWT_SECRET;

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// ───── LOGIN ─────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).send('Email and password required');

    const result = await pool.query(
      "SELECT id, role, data FROM users WHERE data->>'email' = $1", [email]
    );
    if (result.rows.length === 0) return res.status(401).send('Invalid credentials');

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.data.password);
    if (!valid) return res.status(401).send('Invalid credentials');

    const accessToken = jwt.sign(
      { id: user.id, role: user.role },
      secret,
      { expiresIn: '30m', algorithm: 'HS256' }
    );

    res.status(200).json({
      id: user.id,
      role: user.role,
      email: user.data.email,
      name: user.data.name,
      accessToken,
    });

  } catch (err) {
    console.error('Error in login route:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ───── AUTH MIDDLEWARE ───────────────────────────────────────────────────────────
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

// ───── GET FINGERS ───────────────────────────────────────────────────────────────
const getFingers = async (req, res) => {
  const id = req.user.id;
  const roleResult = await pool.query('SELECT role FROM users WHERE id = $1', [id]);

  if (!roleResult.rows[0]) return res.status(404).send('User not found');
  const role = roleResult.rows[0].role;

  try {
    let result;
    if (role === 'patient') {
      result = await pool.query('SELECT * FROM fingers WHERE patient_id = $1', [id]);
    } else if (role === 'doctor') {
      result = await pool.query(`
        SELECT f.*
        FROM fingers f
        JOIN doctor_patients dp ON f.patient_id = dp.patient_id
        WHERE dp.doctor_id = $1
      `, [id]);
    } else {
      return res.status(403).send('Invalid role');
    }

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getFingers:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ───── GET MESSAGES ──────────────────────────────────────────────────────────────
const getMessages = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { patient_id } = req.params;

  try {
    if (userRole === 'doctor') {
      // Doctor: ensure they're assigned to this patient
      const assigned = await pool.query(
        'SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
        [userId, patient_id]
      );
      if (assigned.rowCount === 0) {
        return res.status(403).send('Doctor not assigned to this patient');
      }

      const result = await pool.query(`
        SELECT *
        FROM messages
        WHERE (sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY sent_at ASC
      `, [userId, patient_id]);

      return res.status(200).json(result.rows);

    } else if (userRole === 'patient') {
      // Patient: can only view messages involving themselves
      if (userId !== patient_id) {
        return res.status(403).send('Patients can only view their own messages');
      }

      const doctor = await pool.query(
        'SELECT doctor_id FROM doctor_patients WHERE patient_id = $1',
        [userId]
      );
      if (doctor.rowCount === 0) {
        return res.status(403).send('No doctor assigned');
      }
      const doctorId = doctor.rows[0].doctor_id;

      const result = await pool.query(`
        SELECT *
        FROM messages
        WHERE (sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY sent_at DESC
      `, [userId, doctorId]);

      return res.status(200).json(result.rows);
    }

    return res.status(403).send('Invalid role');
  } catch (err) {
    console.error('Error in getMessages:', err);
    res.status(500).send('Internal Server Error');
  }
};



// ───── SEND MESSAGE ──────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { patient_id } = req.params;
  const { content } = req.body;

  if (!content) return res.status(400).send('Message content required');

  try {
    let recipientId;

    if (userRole === 'doctor') {
      const assigned = await pool.query(
        'SELECT 1 FROM doctor_patients WHERE doctor_id = $1 AND patient_id = $2',
        [userId, patient_id]
      );
      if (assigned.rowCount === 0) return res.status(403).send('Doctor not assigned to this patient');
      recipientId = patient_id;
    } else if (userRole === 'patient') {
      if (userId !== patient_id) return res.status(403).send('Patients can only message their assigned doctor');
      const doctor = await pool.query(
        'SELECT doctor_id FROM doctor_patients WHERE patient_id = $1',
        [userId]
      );
      if (doctor.rowCount === 0) return res.status(403).send('No assigned doctor found');
      recipientId = doctor.rows[0].doctor_id;
    } else {
      return res.status(403).send('Invalid role');
    }

    // Insert and return id + sent_at
    const result = await pool.query(
      `INSERT INTO messages (sender_id, recipient_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sent_at`,
      [userId, recipientId, content]
    );

    const message = result.rows[0];

    res.status(201).json({
      id: message.id,
      sent_at: message.sent_at
    });
  } catch (err) {
    console.error('Error in sendMessage:', err);
    res.status(500).send('Internal Server Error');
  }
};


//  ───── GET PATIENTS ─────────────────────────────────────────────────────────────────
const getPatients = async (req, res) => {
  const requesterId = req.user.id;
  const requesterRole = req.user.role;
  const { doctor_id } = req.params;

  try {
    // Ensure only the doctor themself can access this
    if ((requesterRole !== 'admin')&&(requesterRole !== 'doctor' || requesterId !== doctor_id )) {
      return res.status(403).send('Forbidden: You can only view your own patients');
    }

    const result = await pool.query(`
      SELECT u.id, u.data->>'email' AS email, u.data->>'name' AS name
      FROM doctor_patients dp
      JOIN users u ON dp.patient_id = u.id
      WHERE dp.doctor_id = $1
    `, [doctor_id]);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getPatients:', err);
    res.status(500).send('Internal Server Error');
  }
};

//  ───── GET DOCTOR ─────────────────────────────────────────────────────────────────

const getDoctorForPatient = async (req, res) => {
  const { patient_id } = req.params;
  try {
    const result = await pool.query(`
      SELECT u.id, u.data->>'name' AS name, u.data->>'email' AS email
      FROM doctor_patients dp
      JOIN users u ON dp.doctor_id = u.id
      WHERE dp.patient_id = $1
    `, [patient_id]);

    if (result.rows.length === 0) {
      return res.status(404).send('No doctor assigned to this patient');
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error in getDoctorForPatient:', err);
    res.status(500).send('Internal Server Error');
  }
};

//  ───── CREATE PATIENT ─────────────────────────────────────────────────────────────────


const createPatient = async (req, res) => {
  const doctorId = req.params.doctor_id;
  const requester = req.user;

  if (requester.role !== 'admin' && (requester.role !== 'doctor' || requester.id !== doctorId)) {
    return res.status(403).send('Only the logged-in doctor can create patients for themselves');
  }

  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).send('Missing email, name, or password');
  }

  try {
    const exists = await pool.query("SELECT 1 FROM users WHERE data->>'email' = $1", [email]);
    if (exists.rowCount > 0) {
      return res.status(409).send('Email already in use');
    }

    const hashed = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      `INSERT INTO users (role, data)
       VALUES ('patient', $1)
       RETURNING id`,
      [{ email, name, password: hashed }]
    );

    const patientId = userRes.rows[0].id;

    await pool.query(`INSERT INTO patients (id) VALUES ($1)`, [patientId]);
    await pool.query(`INSERT INTO doctor_patients (doctor_id, patient_id) VALUES ($1, $2)`, [doctorId, patientId]);

    res.status(201).json({ id: patientId, email, name });
  } catch (err) {
    console.error('Error in createPatient:', err);
    res.status(500).send('Internal Server Error');
  }
};


// Delete Message 


const deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.message_id;
  try {
    // Check if the user is the sender of the message
    const result = await pool.query(
      'SELECT * FROM messages WHERE id = $1',
      [messageId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Message not found');
    }

    const message = result.rows[0];

    if (message.sender_id !== userId) {
      return res.status(403).send('You can only delete your own messages');
    }

    await pool.query('DELETE FROM messages WHERE id = $1', [messageId]);
    res.status(200).send('Message deleted');
  } catch (err) {
    console.error('Error in deleteMessage:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Create Doctor

const createDoctor = async (req, res) => {
  const adminId = req.params.admin_id;
  const requester = req.user;
  
  if (requester.role !== 'admin' || requester.id !== adminId) {
    return res.status(403).send('Only an admin can create doctors');
  }

  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).send('Missing email, name, or password');
  }

  try {
    const exists = await pool.query("SELECT 1 FROM users WHERE data->>'email' = $1", [email]);
    if (exists.rowCount > 0) {
      return res.status(409).send('Email already in use');
    }

    const hashed = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      `INSERT INTO users (role, data)
       VALUES ('doctor', $1)
       RETURNING id`,
      [{ email, name, password: hashed }]
    );

    const doctorId = userRes.rows[0].id;

    await pool.query(`INSERT INTO doctors (id) VALUES ($1)`, [doctorId]);

    res.status(201).json({ id: doctorId, email, name });
  } catch (err) {
    console.error('Error in createDoctor:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Get all Doctors

const getAllDoctors = async (req, res) => {
  const requester = req.user;

  if (requester.role !== 'admin') {
    return res.status(403).send('Only an admin can view all doctors');
  }

  try {
    const result = await pool.query(`
      SELECT id, data->>'name' AS name, data->>'email' AS email
      FROM users
      WHERE role = 'doctor'
    `);

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAllDoctors:', err);
    res.status(500).send('Internal Server Error');
  }
};

///         DELETE  A   PATIENT AND THEIR MESSAGES

const deletePatient = async (req, res) => {
  const { patientId } = req.params;

  try {
    // Delete messages related to this patient
    await pool.query('DELETE FROM messages WHERE sender_id = $1 OR recipient_id = $1', [patientId]);

    // Delete the patient
    const result = await pool.query('DELETE FROM users WHERE id = $1 AND role = $2 RETURNING *', [patientId, 'patient']);

    if (result.rowCount === 0) {
      return res.status(404).send('Patient not found or already deleted.');
    }

    res.status(200).send('Patient and associated messages deleted.');
  } catch (err) {
    console.error('Error deleting patient:', err);
    res.status(500).send('Internal Server Error');
  }
};



//   DELETE A DOCTOR AND THEIR PATIENTS AND MESSAGES
const deleteDoctor = async (req, res) => {
  const { doctor_id } = req.params;

  try {
    // Step 1: Get all patient IDs assigned to this doctor
    const patientsResult = await pool.query(
      'SELECT patient_id FROM doctor_patients WHERE doctor_id = $1',
      [doctor_id]
    );

    // Step 2: Delete each patient via their entry in `users`, which cascades everything else
    for (const row of patientsResult.rows) {
      await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [row.patient_id, 'patient']);
    }

    // Step 3: Delete the doctor via `users`, which cascades to `doctors` and `doctor_patients`
    const deleteDoctor = await pool.query(
      'DELETE FROM users WHERE id = $1 AND role = $2 RETURNING *',
      [doctor_id, 'doctor']
    );

    if (deleteDoctor.rowCount === 0) {
      return res.status(404).send('Doctor not found');
    }

    res.status(200).send('Doctor, patients, and associated data successfully deleted');
  } catch (err) {
    console.error('Error deleting doctor:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ADD A DEVICE
//

const addDevice = async (req, res) => {
  const { hardware_id } = req.body;
  const patient_id = req.user.id;
  console.log(patient_id);
  console.log(hardware_id);
  if (!hardware_id) {
    return res.status(400).send('Missing hardware_id');
  }

  if (!patient_id) {
    return res.status(400).send('Missing patient_id');
  }
  try {
    // Insert device if it doesn't already exist
    const deviceResult = await pool.query(
      `INSERT INTO devices (hardware_id)
       VALUES ($1)
       RETURNING hardware_id, id`,
      [hardware_id]
    );
    console.log(deviceResult);
    const device_id = deviceResult.rows[0].id;
    console.log(deviceResult.rows[0]);
    // Link device to patient (if not already linked)
    await pool.query(
      `INSERT INTO patient_devices (patient_id, device_id)
       VALUES ($1, $2)`,
      [patient_id, device_id]
    );
    res.status(200).json({ message: 'Device registered successfully', device_id });
  } catch (err) {
    console.error('Error registering device:', err);
    res.status(500).send('Internal Server Error');
  }
};


//  ADD ASSIGNMENT
//
const addAssignment = async (req, res) => {
  console.log(req.body);
  const { patient_id } = req.params;
  const { name, finger, flexion, reps } = req.body;
  // Authorization: patient can only assign to themselves
  if (req.user.role !== 'doctor') {
    return res.status(403).send('Unauthorized');
  }

  // Validate fields
  if (!name || !finger || !flexion || !reps) {
    return res.status(400).send('Missing one or more required fields');
  }

  try {
    const result = await pool.query(
      `INSERT INTO assignments (patient_id, data)
       VALUES ($1, $2)
       RETURNING id, data`,
      [patient_id, { name, finger, flexion, reps }]
    );

    res.status(201).json({ message: 'Assignment created', assignment: result.rows[0] });
  } catch (err) {
    console.error('Error inserting assignment:', err);
    res.status(500).send('Internal Server Error');
  }
};


// GET ASSIGNMENTS
//
const getAssignments = async (req, res) => {
  const { patient_id } = req.params;

  // Only the patient themself or an admin can access this

  try {
    const result = await pool.query(
      `SELECT id, data
       FROM assignments
       WHERE patient_id = $1`,
      [patient_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).send('Internal Server Error');
  }
};


// PATCH ASSIGNMENTS
//
const modifyAssignment = async (req, res) => {
  const { assignment_id } = req.params;
  const { name, finger, flexion, reps } = req.body;

  try {
    // Fetch current assignment (to preserve any unmodified fields)
    const result = await pool.query(
      `SELECT patient_id, data FROM assignments WHERE id = $1`,
      [assignment_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).send('Assignment not found');
    }

    const assignment = result.rows[0];

    const existing = assignment.data;

    // Merge provided fields into existing data
    const updatedData = {
      name: name !== undefined ? name : existing.name,
      finger: finger !== undefined ? finger : existing.finger,
      flexion: flexion !== undefined ? flexion : existing.flexion,
      reps: reps !== undefined ? reps : existing.reps,
    };

    const update = await pool.query(
      `UPDATE assignments
       SET data = $1
       WHERE id = $2
       RETURNING id, data`,
      [updatedData, assignment_id]
    );

    res.status(200).json({ message: 'Assignment updated', assignment: update.rows[0] });
  } catch (err) {
    console.error('Error modifying assignment:', err);
    res.status(500).send('Internal Server Error');
  }
};

// jho───── GET ALL RUNNER DATA ─────────────────────────────────────────────────────
const getAllRunnerData = async (req, res) => {
  try {
    const result = await pool.query('SELECT id, device_id, data FROM runner');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error in getAllRunnerData:', err);
    res.status(500).send('Internal Server Error');
  }
};

// ───── DELETE ALL RUNNER DATA ────────────────────────────────────────────────────
const deleteAllRunnerData = async (req, res) => {
  try {
    await pool.query('DELETE FROM runner');
    res.status(200).send('All runner data deleted');
  } catch (err) {
    console.error('Error deleting runner data:', err);
    res.status(500).send('Internal Server Error');
  }
};

//  POST TO RUNNER
//

const addRunnerData = async (req, res) => {
  const { device_id } = req.params;
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).send('Missing or invalid data');
  }

  try {
    // Validate that the device exists
    const deviceCheck = await pool.query(
      'SELECT 1 FROM devices WHERE id = $1',
      [device_id]
    );
    if (deviceCheck.rowCount === 0) {
      return res.status(404).send('Device not found');
    }

    const result = await pool.query(
      `INSERT INTO runner (device_id, data)
       VALUES ($1, $2)
       RETURNING id, data`,
      [device_id, data]
    );

    res.status(201).json({ message: 'Runner data saved', runner: result.rows[0] });
  } catch (err) {
    console.error('Error adding runner data:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Get device for patient
//

const getDevicesForPatient = async (req, res) => {
  const { patient_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT d.id, d.hardware_id
       FROM patient_devices pd
       JOIN devices d ON pd.device_id = d.id
       WHERE pd.patient_id = $1`,
      [patient_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching devices:', err);
    res.status(500).send('Internal Server Error');
  }
};

// GET exercise results
//

const getResultsForDevice = async (req, res) => {
  const { device_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, data, created_at
       FROM results
       WHERE device_id = $1
       ORDER BY created_at DESC`,
      [device_id]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching results:', err);
    res.status(500).send('Internal Server Error');
  }
};

// Post result
//

const addResultForDevice = async (req, res) => {
  const { device_id } = req.params;
  const { data } = req.body;

  if (!data || typeof data !== 'object') {
    return res.status(400).send('Missing or invalid result data');
  }

  try {
    const result = await pool.query(
      `INSERT INTO results (device_id, data)
       VALUES ($1, $2)
       RETURNING id, created_at`,
      [device_id, data]
    );

    res.status(201).json({
      message: 'Result recorded',
      result: result.rows[0],
    });
  } catch (err) {
    console.error('Error inserting result:', err);
    res.status(500).send('Internal Server Error');
  }
};

// GET DEVICE ID
//

const findDeviceByHardwareId = async (req, res) => {
  const { hardware_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, hardware_id
       FROM devices
       WHERE hardware_id = $1`,
      [hardware_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Device not found');
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error searching for device:', err);
    res.status(500).send('Internal Server Error');
  }
};


// ───── APP SETUP ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

const apiSpec = path.join(__dirname, '../api/openapi.yaml');
const apidoc = yaml.load(fs.readFileSync(apiSpec, 'utf8'));

app.use('/v0/api-docs', swaggerUi.serve, swaggerUi.setup(apidoc));

app.use(OpenApiValidator.middleware({
  apiSpec,
  validateRequests: true,
  validateResponses: true,
}));

// ───── ROUTES ────────────────────────────────────────────────────────────────────
app.get('/v0/runner', getAllRunnerData);
app.delete('/v0/runner', deleteAllRunnerData);


app.post('/v0/login', login);
app.get('/v0/home', check, getFingers);
app.get('/v0/getmessages/:patient_id', check, getMessages);
app.post('/v0/sendmessage/:patient_id', check, sendMessage);
app.get('/v0/home/:doctor_id', check, getPatients);
app.get('/v0/doctor/:patient_id', check, getDoctorForPatient);
app.post('/v0/create/:doctor_id', check, createPatient);
app.delete('/v0/deletemessage/:message_id', check, deleteMessage);
app.post('/v0/createdoctor/:admin_id', check, createDoctor);
app.get('/v0/doctors', check, getAllDoctors);
app.delete('/v0/deletepatient/:patientId', check, deletePatient);
app.delete('/v0/deletedoctor/:doctor_id', check, deleteDoctor);
app.post('/v0/device/:patient_id', check, addDevice);
app.post('/v0/assignments/patient/:patient_id', check, addAssignment);
app.get('/v0/assignments/patient/:patient_id', check, getAssignments);
app.patch('/v0/assignments/:assignment_id', check, modifyAssignment);
app.post('/v0/runner/:device_id', check, addRunnerData);
app.get('/v0/devices/:patient_id', check, getDevicesForPatient);
app.get('/v0/results/:device_id', check, getResultsForDevice);
app.post('/v0/results/:device_id', addResultForDevice); 
app.get('/v0/devices/search/:hardware_id', check, findDeviceByHardwareId);


// ───── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
    status: err.status,
  });
});

export default app;
