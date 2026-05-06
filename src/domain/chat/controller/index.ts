import type { Server, Socket } from "socket.io";
import type { AudioChunkRequestDto, AudioEndRequestDto, JoinRoomRequestDto } from "@/domain/chat/dto/request";
import type {
	AIAudioChunkResponseDto,
	EmotionStreamResponseDto,
	AITextChunkResponseDto,
	AudioChunkAcceptedResponseDto,
	AudioMergedResponseDto,
	JoinRoomResponseDto,
} from "@/domain/chat/dto/response";
import {
	cleanupChatSession,
	finishAudioStream,
	buildEmotionScores,
	generateAIResponse,
	joinRoom,
	receiveAudioChunk,
	transcribeAudio,
} from "@/domain/chat/service";

type ClientToServerEvents = {
	"chat:room:join": (payload: JoinRoomRequestDto) => void;
	"chat:audio:chunk": (payload: AudioChunkRequestDto) => void;
	"chat:audio:end": (payload: AudioEndRequestDto) => void;
};

type ServerToClientEvents = {
	"chat:room:joined": (payload: JoinRoomResponseDto) => void;
	"chat:audio:chunk:accepted": (payload: AudioChunkAcceptedResponseDto) => void;
	"chat:audio:merged": (payload: AudioMergedResponseDto) => void;
	"chat:emotion:stream": (payload: EmotionStreamResponseDto) => void;
	"chat:ai:text:chunk": (payload: AITextChunkResponseDto) => void;
	"chat:ai:audio:chunk": (payload: AIAudioChunkResponseDto) => void;
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
				const mergedResponse = await finishAudioStream(socket.data.userId, payload);
				socket.emit("chat:audio:merged", mergedResponse);

				// STT
				const mergedBuffer = Buffer.from(mergedResponse.mergedAudioBase64, "base64");
				const userText = await transcribeAudio(mergedBuffer);

				// 텍스트 스트리밍 전에 감정 데이터를 먼저 보낸다.
				const emotion = buildEmotionScores(userText);
				socket.emit("chat:emotion:stream", {
					...emotion,
					roomId: payload.roomId,
				});

				// 최근 대화 문맥(최대 10개)을 포함해 GPT 응답을 스트리밍한다.
				const aiText = await generateAIResponse(
					payload.roomId,
					userText,
					(textChunk) => {
						socket.emit("chat:ai:text:chunk", textChunk);
					},
					(audioChunk) => {
						socket.emit("chat:ai:audio:chunk", audioChunk);
					},
				);

				void aiText;
			} catch (error) {
				emitChatError(socket, error);
			}
		});

		socket.on("disconnect", () => {
			cleanupChatSession(socket.data.userId);
		});
	});
};
