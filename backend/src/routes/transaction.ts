import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { isAuthenticated } from './auth';

const transactionRouter = Router();

transactionRouter.post('/transactions', isAuthenticated , async (req, res) => {
  const transactionBody = z.object({
    userId: z.number(),
    creditedAccountUsername: z.string(),
    value: z.number(),

    payload: z.object({
      userId: z.number(),
      iat: z.number(),
      exp: z.number(),
    }),
  });

  const { userId, creditedAccountUsername, value, payload } = transactionBody.parse(req.body);

  if (userId !== payload.userId) return res.status(401);

  const debitedUser = await prisma.users.findUnique({
    where: {
      id: userId,
    },
    include: {
      account: true,
    }
  });

  if (!debitedUser) return res.sendStatus(400);

  if (debitedUser.username === creditedAccountUsername) return res.status(400).json({
    error: 'Não é possível realizar uma transferencia para você mesmo'
  });

  const creditedUser = await prisma.users.findUnique({
    where: {
      username: creditedAccountUsername,
    }
  });

  if (!creditedUser) return res.status(400).json({ error: 'Usuário não encontrado' });

  if (debitedUser.account && debitedUser.account.balance < value) return res.status(400).json({
    error: 'Saldo insuficiente'
  });

  try {
    await prisma.$transaction([
      prisma.accounts.update({
        where: { id: debitedUser.accountId },
        data: {
          balance: {
            decrement: value,
          }
        }
      }),

      prisma.accounts.update({
        where: { id: creditedUser.accountId },
        data: {
          balance: {
            increment: value,
          }
        }
      }),

      prisma.transactions.create({
        data: {
          value,
          creditedAccountId: creditedUser.accountId,
          debitedAccountId: debitedUser.accountId,
        }
      })
    ]);
  } catch {
    return res.status(400).json({
      error: 'Não foi possível efetuar a transação'
    });
  }

  res.status(200).json();
});

transactionRouter.get('/users/:userId/transactions', isAuthenticated, async (req, res) => {
  const getTransactionsParams = z.object({
    userId: z.number().or(z.string().regex(/\d+/).transform(Number)),
  });

  const getTransactionsQuery = z.object({
    type: z.enum(['cash-in', 'cash-out']).optional(),
    date: z.preprocess((arg) => {
      if (typeof arg == 'string' || arg instanceof Date) return new Date(arg);
    }, z.date()).optional(),
  });

  const getTransactionsBody = z.object({
    payload: z.object({
      userId: z.number(),
      iat: z.number(),
      exp: z.number(),
    }),
  });

  const { userId } = getTransactionsParams.parse(req.params);
  const { date, type } = getTransactionsQuery.parse(req.query);
  const { payload } = getTransactionsBody.parse(req.body);

  if (userId !== payload.userId) return res.sendStatus(401);

  const user = await prisma.users.findUnique({ where: { id: userId } });

  if (!user) return res.sendStatus(400);

  let initialDateTime: Date | undefined;
  let finalDateTime: Date | undefined;

  if (date) {
    initialDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    finalDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  }

  const transactions = await prisma.transactions.findMany({
    where: {
      OR: [
        { debitedAccountId: (!type || type === 'cash-out') ? user.accountId : undefined },
        { creditedAccountId: (!type || type === 'cash-in') ? user.accountId : undefined },
      ],

      createdAt: {
        gte: initialDateTime,
        lt: finalDateTime,
      },
    },
    orderBy: [
      { createdAt: 'desc' }
    ]
  });

  res.status(200).json(transactions);
});

export default transactionRouter;
