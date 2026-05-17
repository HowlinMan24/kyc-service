import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../models/index.js';
import { env } from '../config/env.js';
import { Conflict, Unauthorized } from '../utils/errors.js';

export interface AuthResult {
  token: string;
  user: { id: string; email: string; role: 'admin' | 'reviewer' | 'user' };
}

export async function register(email: string, password: string): Promise<AuthResult> {
  const existing = await User.findOne({ where: { email } });
  if (existing) throw Conflict('Email already registered');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });
  return issueToken(user);
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const user = await User.findOne({ where: { email } });
  if (!user) throw Unauthorized('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Unauthorized('Invalid credentials');
  return issueToken(user);
}

function issueToken(user: User): AuthResult {
  const options = { expiresIn: env.JWT_EXPIRES_IN } as SignOptions;
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    options,
  );
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}
