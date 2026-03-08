import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middleware/auth';

export async function signup(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;
    const result = await authService.signup(username, email, password);
    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    res.status(400).json({ message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ message });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await authService.getMe(req.userId!);
    res.json(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Not found';
    res.status(404).json({ message });
  }
}
