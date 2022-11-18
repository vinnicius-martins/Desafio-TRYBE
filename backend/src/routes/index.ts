import { Router } from 'express';
import authRouter from './auth';
import transactionRouter from './transaction';
import usersRouter from './users';

const router = Router();

router.use(authRouter);
router.use(usersRouter);
router.use(transactionRouter);

export default router;
