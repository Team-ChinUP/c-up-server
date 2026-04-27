import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { findOneByEmail } from "@/domain/auth/repository";
import { sendError } from "@/global/utils/error";

type AccessTokenPayload = {
  email: string;
  type: "access";
};

const getTokenSecret = (): string => process.env.TOKEN_SECRET ?? "dev-only-secret-change-me";

const extractBearerToken = (authorization?: string): string => {
  if (!authorization) {
    throw new Error("Authorization header가 필요합니다.");
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Authorization header 형식이 올바르지 않습니다.");
  }

  return token;
};

const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, getTokenSecret());

    if (!decoded || typeof decoded === "string") {
      throw new Error("유효하지 않은 토큰입니다.");
    }

    const email = decoded.email;
    const type = decoded.type;

    if (typeof email !== "string" || type !== "access") {
      throw new Error("액세스 토큰이 아닙니다.");
    }

    return { email, type };
  } catch {
    throw new Error("유효하지 않거나 만료된 토큰입니다.");
  }
};

export const requireAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<Response | void> => {
  try {
    const token = extractBearerToken(req.headers.authorization);
    const payload = verifyAccessToken(token);
    const user = await findOneByEmail(payload.email);

    if (!user) {
      throw new Error("토큰의 사용자 정보를 찾을 수 없습니다.");
    }

    res.locals.userId = user.id;
    return next();
  } catch (error) {
    return sendError(res, 401, error);
  }
};
