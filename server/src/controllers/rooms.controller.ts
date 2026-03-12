import { Response } from 'express';
import * as roomsService from '../services/rooms.service';
import { AuthRequest } from '../middleware/auth';

export async function createRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await roomsService.createRoom(req.body.name, req.userId!);
    res.status(201).json(room);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create room';
    res.status(400).json({ message });
  }
}

export async function joinRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await roomsService.joinRoom(req.body.code, req.userId!);
    res.json(room);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to join room';
    res.status(400).json({ message });
  }
}

export async function getUserRooms(req: AuthRequest, res: Response): Promise<void> {
  try {
    const rooms = await roomsService.getUserRooms(req.userId!);
    res.json(rooms);
  } catch (err: unknown) {
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
}

export async function getRoomById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await roomsService.getRoomById(Number(req.params.id), req.userId!);
    res.json(room);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Not found';
    const status = message === 'Access denied' ? 403 : 404;
    res.status(status).json({ message });
  }
}

export async function getRoomMembers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const members = await roomsService.getRoomMembers(Number(req.params.id), req.userId!);
    res.json(members);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Not found';
    res.status(400).json({ message });
  }
}

export async function updateRoomStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const room = await roomsService.updateRoomStatus(Number(req.params.id), req.userId!, req.body.status);
    res.json(room);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update';
    res.status(403).json({ message });
  }
}

export async function leaveRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await roomsService.leaveRoom(Number(req.params.id), req.userId!);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to leave';
    res.status(400).json({ message });
  }
}

export async function deleteRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await roomsService.deleteRoom(Number(req.params.id), req.userId!);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete room';
    res.status(403).json({ message });
  }
}
