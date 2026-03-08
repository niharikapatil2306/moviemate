import pool from '../config/db';
import crypto from 'crypto';

function generateCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function createRoom(name: string, userId: number) {
  const code = generateCode();
  const room = await pool.query(
    'INSERT INTO rooms (name, code, host_id) VALUES ($1, $2, $3) RETURNING *',
    [name, code, userId]
  );
  await pool.query(
    'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
    [room.rows[0].id, userId]
  );
  return room.rows[0];
}

export async function joinRoom(code: string, userId: number) {
  const room = await pool.query('SELECT * FROM rooms WHERE code = $1', [code]);
  if (!room.rows[0]) throw new Error('Room not found');
  if (room.rows[0].status !== 'waiting') throw new Error('Room is no longer accepting members');

  const alreadyMember = await pool.query(
    'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
    [room.rows[0].id, userId]
  );
  if (alreadyMember.rows.length > 0) throw new Error('Already in this room');

  await pool.query(
    'INSERT INTO room_members (room_id, user_id) VALUES ($1, $2)',
    [room.rows[0].id, userId]
  );
  return room.rows[0];
}

export async function getUserRooms(userId: number) {
  const result = await pool.query(
    `SELECT r.* FROM rooms r
     JOIN room_members rm ON r.id = rm.room_id
     WHERE rm.user_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getRoomById(roomId: number, userId: number) {
  const member = await pool.query(
    'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if (!member.rows[0]) throw new Error('Access denied');

  const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
  if (!room.rows[0]) throw new Error('Room not found');
  return room.rows[0];
}

export async function getRoomMembers(roomId: number, userId: number) {
  const member = await pool.query(
    'SELECT id FROM room_members WHERE room_id = $1 AND user_id = $2',
    [roomId, userId]
  );
  if (!member.rows[0]) throw new Error('Access denied');

  const result = await pool.query(
    `SELECT u.id, u.username, rm.joined_at FROM users u
     JOIN room_members rm ON u.id = rm.user_id
     WHERE rm.room_id = $1`,
    [roomId]
  );
  return result.rows;
}

export async function updateRoomStatus(roomId: number, userId: number, status: string) {
  const room = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
  if (!room.rows[0]) throw new Error('Room not found');
  if (room.rows[0].host_id !== userId) throw new Error('Only the host can update room status');

  const result = await pool.query(
    'UPDATE rooms SET status = $1 WHERE id = $2 RETURNING *',
    [status, roomId]
  );
  return result.rows[0];
}

export async function leaveRoom(roomId: number, userId: number) {
  const member = await pool.query(
    'DELETE FROM room_members WHERE room_id = $1 AND user_id = $2 RETURNING id',
    [roomId, userId]
  );
  if (!member.rows[0]) throw new Error('Not a member of this room');
  return { message: 'Left room' };
}
