import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

const JWT_SECRET: Secret = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN as SignOptions["expiresIn"];
const JWT_REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface TokenPair {
  token: string;
  refreshToken: string;
}

export function generateTokenPair(payload: JwtPayload): TokenPair {
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { token, refreshToken };
}

export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload & JwtPayload;
  return { userId: decoded.userId, role: decoded.role };
}
