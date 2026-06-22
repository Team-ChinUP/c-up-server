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
	mimeType: string;
};

export type EmotionStreamResponseDto = {
	roomId: number;
	happy: number;
	angry: number;
};

export type TTSViseme = 0 | 1 | 2 | 3 | 4 | 5;

export type TTSWordTimestamp = {
	word: string;
	startMs: number;
	endMs: number;
};

export type TTSPhonemeTimestamp = {
	text: string;
	phoneme: string;
	startMs: number;
	endMs: number;
};

export type TTSVisemeTimestamp = {
	text: string;
	viseme: TTSViseme;
	startMs: number;
	endMs: number;
};

export type TTSAudioAlignment = {
	text: string;
	durationMs: number;
	words: TTSWordTimestamp[];
	phonemes: TTSPhonemeTimestamp[];
	visemes: TTSVisemeTimestamp[];
	source: "estimated";
};

export type AIAudioChunkResponseDto = {
	roomId: number;
	sequence: number;
	chunkBase64: string;
	isComplete: boolean;
	alignment?: TTSAudioAlignment;
};

export type AITextChunkResponseDto = {
	roomId: number;
	text: string;
	isComplete: boolean;
};
