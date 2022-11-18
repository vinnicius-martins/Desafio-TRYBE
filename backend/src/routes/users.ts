import { Router } from 'express';
import { isAuthenticated } from './auth';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const usersRouter = Router();

usersRouter.get('/users/:userId', isAuthenticated , async (req, res) => {
  const getUserParams = z.object({
    userId: z.number().or(z.string().regex(/\d+/).transform(Number)),
  });

  const getUserBody = z.object({
    payload: z.object({
      userId: z.number(),
      iat: z.number(),
      exp: z.number(),
    })
  });

  const { userId } = getUserParams.parse(req.params);
  const { payload } = getUserBody.parse(req.body);

  if (userId !== payload.userId) return res.sendStatus(401);

  const user = await prisma.users.findUnique({
    select: {
      id: true,
      username: true,
      accountId: true,
    },
    where: {
      id: userId
    }
  });

  if (!user) return res.sendStatus(400);

  res.status(200).json({ ...user });
});

usersRouter.get('/users/:userId/balance', isAuthenticated , async (req, res) => {
  const getUserParams = z.object({
    userId: z.number().or(z.string().regex(/\d+/).transform(Number)),
  });

  const getUserBody = z.object({
    payload: z.object({
      userId: z.number(),
      iat: z.number(),
      exp: z.number(),
    })
  });

  const { userId } = getUserParams.parse(req.params);
  const { payload } = getUserBody.parse(req.body);

  if (userId !== payload.userId) return res.sendStatus(401);

  const user = await prisma.users.findUnique({
    select: {
      id: true,
      account: {
        select: {
          balance: true,
        },
      },
    },
    where: {
      id: userId
    }
  });

  if (!user) return res.sendStatus(400);

  res.status(200).json({ ...user });
});

export default usersRouter;
