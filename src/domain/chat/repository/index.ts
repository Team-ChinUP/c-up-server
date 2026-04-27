import type { VoiceFeatures } from "@/domain/chat/dto/request";
import type { ChatSessionEntity } from "@/domain/chat/entity";
import { prisma } from "@/global/config/prisma";

const sessions = new Map<string, ChatSessionEntity>();

const toSessionKey = (userId: number, roomId: number): string => `${userId}:${roomId}`;

export const findRoomByIdAndUserId = async (
	roomId: number,
	userId: number,
): Promise<{ id: number } | null> => {
	return prisma.room.findFirst({
		where: { id: roomId, userId },
		select: { id: true },
	});
};

export const getOrCreateSession = (userId: number, roomId: number): ChatSessionEntity => {
	const key = toSessionKey(userId, roomId);
	const existing = sessions.get(key);

	if (existing) {
		return existing;
	}

	const created: ChatSessionEntity = {
		userId,
		roomId,
		chunks: [],
	};

	sessions.set(key, created);
	return created;
};

export const appendChunk = (
	userId: number,
	roomId: number,
	sequence: number,
	data: Buffer,
	voiceFeatures: VoiceFeatures,
): number => {
	const session = getOrCreateSession(userId, roomId);
	session.chunks.push({ sequence, data, voiceFeatures });
	return session.chunks.length;
};

export const popMergedChunks = (
	userId: number,
	roomId: number,
): { chunkCount: number; merged: Buffer } => {
	const session = getOrCreateSession(userId, roomId);
	if (session.chunks.length === 0) {
		throw new Error("수집된 음성 chunk가 없습니다.");
	}

	const sorted = [...session.chunks].sort((a, b) => a.sequence - b.sequence);
	const merged = Buffer.concat(sorted.map((chunk) => chunk.data));
	const chunkCount = sorted.length;
	session.chunks = [];

	return { chunkCount, merged };
};

export const clearUserSessions = (userId: number): void => {
	for (const key of sessions.keys()) {
		if (key.startsWith(`${userId}:`)) {
			sessions.delete(key);
		}
	}
};
