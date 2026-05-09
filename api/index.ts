import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRoutes, { seedAdmin } from '../server/routes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Main API Routes
app.use('/api', apiRoutes);

// Health check and basic routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    time: new Date().toISOString(), 
    env: process.env.NODE_ENV 
  });
});

app.get('/', (req, res) => {
  res.send('Server is running');
});

// Database connection logic
if (!process.env.MONGODB_URI) {
  console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      seedAdmin().catch(err => console.error('Seed Error:', err));
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });
}

export default app;
