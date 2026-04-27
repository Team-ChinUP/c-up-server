export type JoinRoomRequestDto = {
	roomId: number;
};

export type VoiceFeatures = {
	pitch: number;
	energy: number;
	speed: number;
};

export type AudioChunkRequestDto = {
	roomId: number;
	chunkBase64: string;
	sequence: number;
	voiceFeatures: VoiceFeatures;
};

export type AudioEndRequestDto = {
	roomId: number;
};
