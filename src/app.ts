import cors from "cors";
import express from "express";
import { authRouter } from "@/domain/auth/controller";
import { roomRouter } from "@/domain/room/controller";
import { requireAccessToken } from "@/global/middleware/auth";
import { sendResponse } from "@/global/utils/response";

export const app = express();

app.use(cors());
app.use(express.json());
app.use("/auth", authRouter);
app.use(requireAccessToken);
app.use("/room", roomRouter);

app.get("/", (_req, res) => {
  return sendResponse(res, 200, null, "c-up server is running");
});