import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import * as roomsController from '../controllers/rooms.controller';

const router = Router();

const createSchema = z.object({ name: z.string().min(1).max(100) });
const joinSchema = z.object({ code: z.string().length(6) });
const statusSchema = z.object({ status: z.enum(['waiting', 'swiping', 'done']) });

router.use(authenticate);

router.post('/', validate(createSchema), roomsController.createRoom);
router.post('/join', validate(joinSchema), roomsController.joinRoom);
router.get('/', roomsController.getUserRooms);
router.get('/:id', roomsController.getRoomById);
router.get('/:id/members', roomsController.getRoomMembers);
router.patch('/:id/status', validate(statusSchema), roomsController.updateRoomStatus);
router.delete('/:id/leave', roomsController.leaveRoom);

export default router;
