import type { NextFunction, Request, Response } from "express";
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

    res.locals.userId = payload.userId;
    return next();
  } catch (error) {
    return sendError(res, 401, error);
  }
};
