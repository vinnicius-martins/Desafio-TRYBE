import jwt from 'jsonwebtoken';

interface UserType {
  id: number;
  password: string;
  username: string;
  accountId: number;
}

export function generateAccessToken(user: UserType) {
  return jwt.sign({ userId: user.id }, String(process.env.JWT_ACCESS_SECRET), {
    expiresIn: '24h',
  });
}
