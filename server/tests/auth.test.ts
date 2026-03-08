import request from 'supertest';
import { app } from '../src/index';
import pool from '../src/config/db';

beforeAll(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
});

afterAll(async () => {
  await pool.query('DELETE FROM users WHERE email LIKE $1', ['test_%@example.com']);
  await pool.end();
});

describe('POST /api/auth/signup', () => {
  it('creates a user and returns token', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      username: 'test_user1',
      email: 'test_user1@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test_user1@example.com');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/signup').send({
      username: 'test_user2',
      email: 'test_dup@example.com',
      password: 'password123',
    });
    const res = await request(app).post('/api/auth/signup').send({
      username: 'test_user3',
      email: 'test_dup@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/signup').send({ email: 'test_x@example.com' });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      username: 'test_user4',
      email: 'test_user4@example.com',
      password: '123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    await request(app).post('/api/auth/signup').send({
      username: 'test_login',
      email: 'test_login@example.com',
      password: 'password123',
    });
  });

  it('logs in with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test_login@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test_login@example.com',
      password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test_nobody@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  let token: string;

  beforeAll(async () => {
    const res = await request(app).post('/api/auth/signup').send({
      username: 'test_me',
      email: 'test_me@example.com',
      password: 'password123',
    });
    token = res.body.token;
  });

  it('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('username', 'test_me');
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer badtoken');
    expect(res.status).toBe(401);
  });
});
