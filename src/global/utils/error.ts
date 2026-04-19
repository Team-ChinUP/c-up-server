import type { Response } from "express";

type ErrorResponse = {
  status: number;
  message: string;
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
};

export const sendError = (
  res: Response,
  status: number,
  error: unknown,
): Response => {
  const payload: ErrorResponse = {
    status,
    message: getErrorMessage(error),
  };

  return res.status(status).json(payload);
};
