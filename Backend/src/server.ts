import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import routes from './routes';
// Import db configuration to automatically ensure schema initialization on startup
import './config/db';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: '*', // open for client test calls
  })
);

app.use(express.json());

// Main aggregated routing path
app.use('/api', routes);

// Base health route
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: 'VendorBridge SQLite Backend',
  });
});

if (process.env.IN_VERIFY_TEST !== 'true') {
  app.listen(PORT, () => {
    console.log(`Express server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}

export default app;
