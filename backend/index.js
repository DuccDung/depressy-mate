require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');

// Import routes
const authRoutes = require('./routes/authRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const journalRoutes = require('./routes/journalRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const clinicRoutes = require('./routes/clinicRoutes');
const postRoutes = require('./routes/postRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');

// Socket.io
const { initSocket } = require('./config/socket');
const setupChatSocket = require('./sockets/chatSocket');

const app = express();

// Middlewares bảo mật
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Depressy Mate API is running!' });
});

app.use('/api/auth', authRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/checkins', checkinRoutes);
app.use('/api/journals', journalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', interactionRoutes);
app.use('/api', chatRoutes);
app.use('/api/users', userRoutes);

// Khu vực test — có thể xóa khi deploy
const pool = require('./config/db');
app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

// Tạo HTTP server + Socket.io (chung port)
const server = http.createServer(app);
const io = initSocket(server);
setupChatSocket(io);

// Start server
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
  console.log(`Socket.io server ready on port ${port}`);
});
