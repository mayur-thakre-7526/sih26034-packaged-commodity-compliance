import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './features/auth/auth.routes.js';
import usersRoutes from './features/users/users.routes.js';
import productsRoutes from './features/products/products.routes.js';
import scansRoutes from './features/scans/scans.routes.js';
import dashboardRoutes from './features/dashboard/dashboard.routes.js';

const app = express();

app.use(helmet());
const corsOptions = {
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL : '*',
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/scans', scansRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use(errorHandler);

export default app;
