import cors from "cors";
import express from "express";
import { authRouter } from "@/domain/auth/controller";
import { sendResponse } from "@/global/utils/response";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);

app.get("/", (_req, res) => {
  return sendResponse(res, 200, null, "c-up server is running");
});