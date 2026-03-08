import request from 'supertest';
import { app } from '../src/index';
import pool from '../src/config/db';

let token1: string;
let token2: string;
let roomId: number;
let roomCode: string;

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, code VARCHAR(8) UNIQUE NOT NULL,
      host_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) DEFAULT 'waiting', created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS room_members (
      id SERIAL PRIMARY KEY, room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(room_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS swipes (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE, movie_id INTEGER NOT NULL,
      direction VARCHAR(10) NOT NULL, created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, room_id, movie_id)
    );
  `);

  const r1 = await request(app).post('/api/auth/signup').send({
    username: 'room_user1', email: 'room_user1@example.com', password: 'password123',
  });
  token1 = r1.body.token;

  const r2 = await request(app).post('/api/auth/signup').send({
    username: 'room_user2', email: 'room_user2@example.com', password: 'password123',
  });
  token2 = r2.body.token;
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [
    'room_user1@example.com', 'room_user2@example.com',
  ]);
  await pool.end();
});

describe('POST /api/rooms', () => {
  it('creates a room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token1}`)
      .send({ name: 'Movie Night' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('code');
    roomId = res.body.id;
    roomCode = res.body.code;
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token1}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('requires auth', async () => {
    const res = await request(app).post('/api/rooms').send({ name: 'test' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/rooms/join', () => {
  it('lets another user join', async () => {
    const res = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${token2}`)
      .send({ code: roomCode });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(roomId);
  });

  it('rejects joining same room twice', async () => {
    const res = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${token2}`)
      .send({ code: roomCode });
    expect(res.status).toBe(400);
  });

  it('rejects invalid code', async () => {
    const res = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${token2}`)
      .send({ code: 'XXXXXX' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/rooms', () => {
  it('returns user rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('GET /api/rooms/:id/members', () => {
  it('returns room members', async () => {
    const res = await request(app)
      .get(`/api/rooms/${roomId}/members`)
      .set('Authorization', `Bearer ${token1}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });
});

describe('PATCH /api/rooms/:id/status', () => {
  it('host can update status', async () => {
    const res = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ status: 'swiping' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('swiping');
  });

  it('non-host cannot update status', async () => {
    const res = await request(app)
      .patch(`/api/rooms/${roomId}/status`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ status: 'done' });
    expect(res.status).toBe(403);
  });
});
