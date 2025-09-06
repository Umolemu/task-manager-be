import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import type { Request, Response, NextFunction } from "express";
import type { User } from "../Types/types";

// Ensure env is loaded before reading JWT secret
dotenv.config();
const SECRET = process.env.JWT_SECRET || "fallback_secret";

export function Auth(
  req: Request & { user?: User },
  res: Response,
  next: NextFunction
) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  try {
    if (!token) return res.status(401).json({ error: "missing token" });
  const payload = jwt.verify(token, SECRET) as { id: string; email: string };
  // Attach minimal user info; downstream can use id/email
  req.user = { id: payload.id, name: "", email: payload.email } as User;
    next();
  } catch (e) {
    return res.status(401).json({ error: "invalid token" });
  }
}
