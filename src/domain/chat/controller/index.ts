import type { Server, Socket } from "socket.io";
import type { AudioChunkRequestDto, AudioEndRequestDto, JoinRoomRequestDto } from "@/domain/chat/dto/request";
import type {
	AudioChunkAcceptedResponseDto,
	AudioMergedResponseDto,
	JoinRoomResponseDto,
} from "@/domain/chat/dto/response";
import { cleanupChatSession, finishAudioStream, joinRoom, receiveAudioChunk } from "@/domain/chat/service";

type ClientToServerEvents = {
	"chat:room:join": (payload: JoinRoomRequestDto) => void;
	"chat:audio:chunk": (payload: AudioChunkRequestDto) => void;
	"chat:audio:end": (payload: AudioEndRequestDto) => void;
};

type ServerToClientEvents = {
	"chat:room:joined": (payload: JoinRoomResponseDto) => void;
	"chat:audio:chunk:accepted": (payload: AudioChunkAcceptedResponseDto) => void;
	"chat:audio:merged": (payload: AudioMergedResponseDto) => void;
	"chat:error": (payload: { message: string }) => void;
};

type ChatSocketData = {
	userId: number;
};

type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, object, ChatSocketData>;
type ChatIo = Server<ClientToServerEvents, ServerToClientEvents, object, ChatSocketData>;

const emitChatError = (socket: ChatSocket, error: unknown): void => {
	const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
	socket.emit("chat:error", { message });
};

export const registerChatSocketHandlers = (io: ChatIo): void => {
	io.on("connection", (socket: ChatSocket) => {
		socket.on("chat:room:join", async (payload: JoinRoomRequestDto) => {
			try {
				const response = await joinRoom(socket.data.userId, payload);
				socket.join(String(response.roomId));
				socket.emit("chat:room:joined", response);
			} catch (error) {
				emitChatError(socket, error);
			}
		});

		socket.on("chat:audio:chunk", async (payload: AudioChunkRequestDto) => {
			try {
				const response = await receiveAudioChunk(socket.data.userId, payload);
				socket.emit("chat:audio:chunk:accepted", response);
			} catch (error) {
				emitChatError(socket, error);
			}
		});

		socket.on("chat:audio:end", async (payload: AudioEndRequestDto) => {
			try {
				const response = await finishAudioStream(socket.data.userId, payload);
				socket.emit("chat:audio:merged", response);
			} catch (error) {
				emitChatError(socket, error);
			}
		});

		socket.on("disconnect", () => {
			cleanupChatSession(socket.data.userId);
		});
	});
};
