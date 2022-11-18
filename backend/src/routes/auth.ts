import { RequestHandler, Router } from 'express';
import { validatePasswordHash, hashPassword } from '../lib/bcrypt';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { generateAccessToken } from '../lib/jwt';
import jwt from 'jsonwebtoken';

const authRouter = Router();

authRouter.post('/users', async (req, res) => {
  const createUserBody = z.object({
    username: z.string(),
    password: z.string(),
  });

  const { username, password } = createUserBody.parse(req.body);

  if (!username || !password) return res.status(400).json({
    error: 'Preencha todos os campos do formulário'
  });

  let user = await prisma.users.findUnique({
    where: {
      username
    },
  });

  if (user) return res.status(400).json({
    error: `O usuário ${username} já existe`
  });

  if (username.length < 3) return res.status(400).json({
    error: 'O nome de usuário deve conter pelo menos 3 caracteres'
  });

  if (password.length < 8) return res.status(400).json({
    error: 'A senha deve conter pelo menos 8 caracteres'
  });

  if (!password.match(/[A-Z]/)) return res.status(400).json({
    error: 'A senha deve conter pelo menos 1 letra maiúscula'
  });

  if (!password.match(/[0-9]/)) return res.status(400).json({
    error: 'A senha deve conter pelo menos 1 número'
  });

  const hashedPassword = await hashPassword(password);

  user = await prisma.users.create({
    data: {
      username,
      password: hashedPassword,
      account: {
        create: {
          balance: 100,
        }
      }
    }
  });

  res.status(201).json(user);
});

authRouter.post('/login', async (req, res) => {
  const loginBody = z.object({
    username: z.string(),
    password: z.string(),
  });

  const { username, password } = loginBody.parse(req.body);

  const user = await prisma.users.findUnique({
    where: {
      username
    }
  });

  let passwordValidation: boolean | undefined;
  if (user) {
    passwordValidation = await validatePasswordHash(password, user.password);
  }

  if (!user || !passwordValidation) return res.status(400).json({ error: 'Usuário ou senha incorretos' });

  const access_token = generateAccessToken(user);

  res.json({ access_token });
});

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    res.status(401);
    throw new Error('Access denied');
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, String(process.env.JWT_ACCESS_SECRET), (err, payload) => {
    req.body = { ...req.body, payload };
    if (err) {
      res.status(401);
      if (err.name === 'TokenExpiredError') {
        throw new Error(err.name);
      }
      throw new Error('Access denied');
    }
  });

  return next();
};

export default authRouter;
