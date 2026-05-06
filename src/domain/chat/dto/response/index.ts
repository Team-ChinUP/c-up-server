export type JoinRoomResponseDto = {
	roomId: number;
};

export type AudioChunkAcceptedResponseDto = {
	roomId: number;
	sequence: number;
	bufferedChunkCount: number;
};

export type AudioMergedResponseDto = {
	roomId: number;
	chunkCount: number;
	totalBytes: number;
	mergedAudioBase64: string;
};

export type EmotionStreamResponseDto = {
	roomId: number;
	happy: number;
	sad: number;
	angry: number;
	joy: number;
};

export type AIAudioChunkResponseDto = {
	roomId: number;
	sequence: number;
	chunkBase64: string;
	isComplete: boolean;
};

export type AITextChunkResponseDto = {
	roomId: number;
	text: string;
	isComplete: boolean;
};
