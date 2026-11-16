const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const birdRoutes = require('./routes/bird.routes');
const feedingRoutes = require('./routes/feeding.routes');
const breedingRoutes = require('./routes/breeding.routes');
const reportRoutes = require('./routes/report.routes');
const domeRoutes = require('./routes/dome.routes');
const habitatRoutes = require('./routes/habitat.routes');
const speciesRoutes = require('./routes/species.routes');
const healthRoutes = require('./routes/health.routes');
const transferRoutes = require('./routes/transfer.routes');
const reminderRoutes = require('./routes/reminder.routes');
const uploadRoutes = require('./routes/upload.routes');
const auditRoutes = require('./routes/audit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const workflowRoutes = require('./routes/workflows.routes');
const auditTrail = require('./middlewares/audit.middleware');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));
app.use('/api', auditTrail);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/birds', birdRoutes);
app.use('/api/feeding', feedingRoutes);
app.use('/api/breeding', breedingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/domes', domeRoutes);
app.use('/api/habitats', habitatRoutes);
app.use('/api/species', speciesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/workflows', workflowRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('Bird Monitoring API is running');
});

module.exports = app;
