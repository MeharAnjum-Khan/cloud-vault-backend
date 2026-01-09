import express from 'express';
import cors from 'cors';

const app = express();

// Allow frontend requests
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Health check route (VERY IMPORTANT)
app.get('/', (req, res) => {
  res.send('CloudVault Backend is running 🚀');
});

export default app;
