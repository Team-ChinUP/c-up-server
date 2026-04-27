import type { NextFunction, Request, Response } from "express";
import { findOneByEmail } from "@/domain/auth/repository";
import { sendError } from "@/global/utils/error";
import { extractBearerToken, verifyAccessToken } from "@/global/utils/auth-token";

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
