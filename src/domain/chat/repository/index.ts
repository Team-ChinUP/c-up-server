import type { VoiceFeatures } from "@/domain/chat/dto/request";
import type { ChatSessionEntity } from "@/domain/chat/entity";
import { SenderType } from "@prisma/client";
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

export type ConversationMessage = {
	senderType: SenderType;
	message: string;
};

export const saveMessage = async (
	roomId: number,
	senderType: SenderType,
	message: string,
): Promise<void> => {
	await prisma.message.create({
		data: {
			roomId,
			senderType,
			message,
		},
	});
};

export const findRecentMessages = async (
	roomId: number,
	limit: number,
): Promise<ConversationMessage[]> => {
	const rows = await prisma.message.findMany({
		where: { roomId },
		orderBy: { createdAt: "desc" },
		take: limit,
		select: {
			senderType: true,
			message: true,
		},
	});

	// 최신순으로 조회했기 때문에 프롬프트 주입 전 시간순으로 되돌린다.
	return rows.reverse();
};
