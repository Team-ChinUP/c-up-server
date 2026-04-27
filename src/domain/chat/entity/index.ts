import type { VoiceFeatures } from "@/domain/chat/dto/request";

export type BufferedAudioChunk = {
	sequence: number;
	data: Buffer;
	voiceFeatures: VoiceFeatures;
};

export type ChatSessionEntity = {
	userId: number;
	roomId: number;
	chunks: BufferedAudioChunk[];
};
