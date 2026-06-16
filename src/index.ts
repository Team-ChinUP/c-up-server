import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { app } from "@/app";
import { registerChatSocketHandlers } from "@/domain/chat/controller";
import { extractBearerToken, verifyAccessToken } from "@/global/utils/auth-token";

const port = Number(process.env.PORT) || 8080;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

io.use((socket, next) => {
  try {
    const authToken = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined;
    const headerToken = socket.handshake.headers.authorization;
    const token = authToken ?? extractBearerToken(headerToken);
    const payload = verifyAccessToken(token);

    socket.data.userId = payload.userId;
    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "인증에 실패했습니다.";
    return next(new Error(message));
  }
});

registerChatSocketHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
