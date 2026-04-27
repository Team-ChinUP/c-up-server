import type { AudioChunkRequestDto, AudioEndRequestDto, JoinRoomRequestDto } from "@/domain/chat/dto/request";
import type {
	AudioChunkAcceptedResponseDto,
	AudioMergedResponseDto,
	JoinRoomResponseDto,
} from "@/domain/chat/dto/response";
import { appendChunk, clearUserSessions, findRoomByIdAndUserId, popMergedChunks } from "@/domain/chat/repository";

const validateOwnership = async (userId: number, roomId: number): Promise<void> => {
	const room = await findRoomByIdAndUserId(roomId, userId);
	if (!room) {
		throw new Error("접근할 수 없는 room입니다.");
	}
};

export const joinRoom = async (
	userId: number,
	dto: JoinRoomRequestDto,
): Promise<JoinRoomResponseDto> => {
	await validateOwnership(userId, dto.roomId);

	return {
		roomId: dto.roomId,
	};
};

export const receiveAudioChunk = async (
	userId: number,
	dto: AudioChunkRequestDto,
): Promise<AudioChunkAcceptedResponseDto> => {
	await validateOwnership(userId, dto.roomId);

	if (!dto.chunkBase64) {
		throw new Error("chunkBase64 값이 필요합니다.");
	}

	const chunkData = Buffer.from(dto.chunkBase64, "base64");
	if (chunkData.length === 0) {
		throw new Error("유효하지 않은 음성 chunk입니다.");
	}

	const bufferedChunkCount = appendChunk(userId, dto.roomId, dto.sequence, chunkData, dto.voiceFeatures);

	return {
		roomId: dto.roomId,
		sequence: dto.sequence,
		bufferedChunkCount,
	};
};

export const finishAudioStream = async (
	userId: number,
	dto: AudioEndRequestDto,
): Promise<AudioMergedResponseDto> => {
	await validateOwnership(userId, dto.roomId);

	const { chunkCount, merged } = popMergedChunks(userId, dto.roomId);

	return {
		roomId: dto.roomId,
		chunkCount,
		totalBytes: merged.length,
		mergedAudioBase64: merged.toString("base64"),
	};
};

export const cleanupChatSession = (userId: number): void => {
	clearUserSessions(userId);
};
