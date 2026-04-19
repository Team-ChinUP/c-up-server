import type { Response } from "express";

type BaseResponse<T> = {
  status: number;
  data: T;
  message: string;
};

export const sendResponse = <T>(
  res: Response,
  status: number,
  data: T,
  message: string,
): Response => {
  const payload: BaseResponse<T> = {
    status,
    data,
    message,
  };

  return res.status(status).json(payload);
};
