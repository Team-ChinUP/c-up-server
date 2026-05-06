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
	appendChunk,
	clearUserSessions,
	findRecentMessages,
	findRoomByIdAndUserId,
	popMergedChunks,
	saveMessage,
} from "@/domain/chat/repository";
import { openai } from "@/global/config/openai";
import { SenderType } from "@prisma/client";

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

export const transcribeAudio = async (audioBuffer: Buffer, language: string = "ko"): Promise<string> => {
	const uint8Array = new Uint8Array(audioBuffer);
	const file = new File([uint8Array], "audio.wav", { type: "audio/wav" });

	const transcription = await openai.audio.transcriptions.create({
		file,
		model: "whisper-1",
		language,
	});

	return transcription.text;
};

export const buildEmotionScores = (userText: string): EmotionStreamResponseDto => {
	const loweredText = userText.toLowerCase();

	const happyKeywords = ["행복", "기뻐", "좋아", "만족", "웃"];
	const sadKeywords = ["슬프", "우울", "눈물", "허전", "서운", "힘들"];
	const angryKeywords = ["화나", "짜증", "분노", "열받", "억울"];
	const joyKeywords = ["신나", "즐거", "설레", "흥분", "환호"];

	const countMatches = (keywords: string[]): number =>
		keywords.filter((keyword) => loweredText.includes(keyword)).length;

	const happy = 1 + countMatches(happyKeywords) * 2;
	const sad = 1 + countMatches(sadKeywords) * 2;
	const angry = 1 + countMatches(angryKeywords) * 2;
	const joy = 1 + countMatches(joyKeywords) * 2;
	const total = happy + sad + angry + joy;

	return {
		roomId: 0,
		happy: Number((happy / total).toFixed(2)),
		sad: Number((sad / total).toFixed(2)),
		angry: Number((angry / total).toFixed(2)),
		joy: Number((joy / total).toFixed(2)),
	};
};

export const generateAIResponse = async (
	roomId: number,
	userText: string,
	onTextChunk: (chunk: AITextChunkResponseDto) => void,
	onAudioChunk: (chunk: AIAudioChunkResponseDto) => void,
): Promise<string> => {
	// 현재 사용자 발화를 먼저 저장한 뒤 최근 10개 대화를 문맥으로 가져온다.
	await saveMessage(roomId, SenderType.USER, userText);
	const recentMessages = await findRecentMessages(roomId, 10);

	const systemPrompt =
		"당신은 친근한 AI 캐릭터입니다. 이전 대화 문맥을 유지하며 자연스럽고 일관된 톤으로 한국어로 대답하세요.";

	const messages = [
		{
			role: "system" as const,
			content: systemPrompt,
		},
		...recentMessages.map((message) => ({
			role: message.senderType === SenderType.USER ? ("user" as const) : ("assistant" as const),
			content: message.message,
		})),
	];

	const stream = await openai.chat.completions.create({
		model: "gpt-4o-mini",
		messages,
		stream: true,
		temperature: 0.8,
		max_tokens: 300,
	});

	let fullText = "";
	let pendingSpeechText = "";
	let sequence = 0;
	const speechTasks: Promise<void>[] = [];

	const flushSpeechChunk = (speechText: string): void => {
		const trimmedText = speechText.trim();
		if (!trimmedText) {
			return;
		}

		const currentSequence = sequence;
		sequence += 1;

		const task = openai.audio.speech.create({
			model: "gpt-4o-mini-tts",
			voice: "alloy",
			input: trimmedText,
			response_format: "mp3",
		}).then(async (speech) => {
			const audioBuffer = Buffer.from(await speech.arrayBuffer());
			onAudioChunk({
				roomId,
				sequence: currentSequence,
				chunkBase64: audioBuffer.toString("base64"),
				isComplete: false,
			});
		}).catch(() => {
			// 음성 생성 실패는 텍스트 스트리밍을 막지 않는다.
		});
		speechTasks.push(task);
	};

	for await (const chunk of stream) {
		const delta = chunk.choices[0]?.delta?.content;

		if (delta) {
			fullText += delta;
			pendingSpeechText += delta;

			onTextChunk({
				roomId,
				text: delta,
				isComplete: false,
			});

			if (/[.!?。！？\n]/.test(delta) || pendingSpeechText.length >= 50) {
				const speechText = pendingSpeechText;
				pendingSpeechText = "";
				flushSpeechChunk(speechText);
			}
		}
	}

	if (pendingSpeechText.trim().length > 0) {
		flushSpeechChunk(pendingSpeechText);
	}

	if (speechTasks.length > 0) {
		await Promise.allSettled(speechTasks);
	}

	// AI 응답 전체를 저장해 다음 턴에서 문맥으로 재사용한다.
	if (fullText.trim().length > 0) {
		await saveMessage(roomId, SenderType.AI, fullText);
	}

	onTextChunk({
		roomId,
		text: "",
		isComplete: true,
	});

	onAudioChunk({
		roomId,
		sequence,
		chunkBase64: "",
		isComplete: true,
	});

	return fullText;
};

export const streamTextToSpeech = async (
	roomId: number,
	text: string,
	onAudioChunk: (chunk: AIAudioChunkResponseDto) => void,
): Promise<void> => {
	if (!text.trim()) {
		onAudioChunk({
			roomId,
			sequence: 0,
			chunkBase64: "",
			isComplete: true,
		});
		return;
	}

	const speech = await openai.audio.speech.create({
		model: "tts-1",
		voice: "alloy",
		input: text,
		response_format: "mp3",
	});

	const reader = speech.body?.getReader();
	let sequence = 0;

	if (!reader) {
		const audioBuffer = Buffer.from(await speech.arrayBuffer());
		onAudioChunk({
			roomId,
			sequence,
			chunkBase64: audioBuffer.toString("base64"),
			isComplete: true,
		});
		return;
	}

	while (true) {
		const { done, value } = await reader.read();
		if (done) {
			break;
		}

		if (value && value.length > 0) {
			onAudioChunk({
				roomId,
				sequence,
				chunkBase64: Buffer.from(value).toString("base64"),
				isComplete: false,
			});
			sequence += 1;
		}
	}

	onAudioChunk({
		roomId,
		sequence,
		chunkBase64: "",
		isComplete: true,
	});
};
