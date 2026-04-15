import cors from "cors";
import express from "express";

export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "c-up server is running" });
});
