import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import pool from './config/db';
import authRoutes from './routes/auth.routes';
import roomsRoutes from './routes/rooms.routes';
import swipeRoutes from './routes/swipe.routes';

export const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api', swipeRoutes);

app.use((_req, res) => res.status(404).json({ message: 'Not found' }));

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  // dev: __dirname = src/,  prod: __dirname = dist/
  const devPath = path.join(__dirname, 'db/schema.sql');
  const prodPath = path.join(__dirname, '../src/db/schema.sql');
  const schemaPath = fs.existsSync(devPath) ? devPath : prodPath;
  const schema = fs.readFileSync(schemaPath, 'utf8');
  pool.query(schema)
    .catch((err) => console.warn('Schema init warning:', err.message))
    .finally(() => {
      app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
    });
}
