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
