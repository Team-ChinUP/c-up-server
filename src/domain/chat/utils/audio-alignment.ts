import type {
	TTSAudioAlignment,
	TTSPhonemeTimestamp,
	TTSViseme,
	TTSVisemeTimestamp,
	TTSWordTimestamp,
} from "@/domain/chat/dto/response";

const HANGUL_BASE_CODE = 0xac00;
const HANGUL_END_CODE = 0xd7a3;
const HANGUL_FINAL_COUNT = 28;
const HANGUL_MEDIAL_COUNT = 21;
const DEFAULT_CHAR_DURATION_MS = 120;
const MIN_ALIGNMENT_DURATION_MS = 480;
const PUNCTUATION_DURATION_MS: Record<string, number> = {
	".": 280,
	",": 180,
	" ": 90,
	"\n": 220,
	"\t": 120,
	"!": 260,
	"?": 260,
	"…": 340,
};

const medialIndexToPhoneme: Record<number, string> = {
	0: "ㅏ",
	1: "ㅐ",
	2: "ㅑ",
	3: "ㅒ",
	4: "ㅓ",
	5: "ㅔ",
	6: "ㅕ",
	7: "ㅖ",
	8: "ㅗ",
	9: "ㅘ",
	10: "ㅙ",
	11: "ㅚ",
	12: "ㅛ",
	13: "ㅜ",
	14: "ㅝ",
	15: "ㅞ",
	16: "ㅟ",
	17: "ㅠ",
	18: "ㅡ",
	19: "ㅢ",
	20: "ㅣ",
};

const medialIndexToViseme: Record<number, TTSViseme> = {
	0: 1,
	1: 2,
	2: 1,
	3: 2,
	4: 2,
	5: 2,
	6: 2,
	7: 2,
	8: 4,
	9: 1,
	10: 1,
	11: 1,
	12: 4,
	13: 5,
	14: 5,
	15: 5,
	16: 5,
	17: 5,
	18: 5,
	19: 3,
	20: 3,
};

const jamoToViseme: Record<string, TTSViseme> = {
	"ㅏ": 1,
	"ㅑ": 1,
	"ㅘ": 1,
	"ㅙ": 1,
	"ㅚ": 1,
	"ㅐ": 2,
	"ㅒ": 2,
	"ㅔ": 2,
	"ㅖ": 2,
	"ㅣ": 3,
	"ㅢ": 3,
	"ㅗ": 4,
	"ㅛ": 4,
	"ㅜ": 5,
	"ㅠ": 5,
	"ㅝ": 5,
	"ㅞ": 5,
	"ㅟ": 5,
	"ㅡ": 5,
};

type CharacterTiming = {
	text: string;
	phoneme: string;
	viseme: TTSViseme;
	weightMs: number;
	startMs: number;
	endMs: number;
};

const getHangulMedialIndex = (char: string): number | null => {
	const charCode = char.charCodeAt(0);

	if (charCode < HANGUL_BASE_CODE || charCode > HANGUL_END_CODE) {
		return null;
	}

	const syllableIndex = charCode - HANGUL_BASE_CODE;
	return Math.floor(syllableIndex / HANGUL_FINAL_COUNT) % HANGUL_MEDIAL_COUNT;
};

const getCharacterTimingBase = (char: string): Omit<CharacterTiming, "startMs" | "endMs"> => {
	const punctuationDuration = PUNCTUATION_DURATION_MS[char];

	if (punctuationDuration !== undefined) {
		return {
			text: char,
			phoneme: char.trim() ? char : "space",
			viseme: 0,
			weightMs: punctuationDuration,
		};
	}

	const jamoViseme = jamoToViseme[char];

	if (jamoViseme !== undefined) {
		return {
			text: char,
			phoneme: char,
			viseme: jamoViseme,
			weightMs: DEFAULT_CHAR_DURATION_MS,
		};
	}

	const medialIndex = getHangulMedialIndex(char);

	if (medialIndex !== null) {
		return {
			text: char,
			phoneme: medialIndexToPhoneme[medialIndex] ?? char,
			viseme: medialIndexToViseme[medialIndex] ?? 0,
			weightMs: DEFAULT_CHAR_DURATION_MS,
		};
	}

	return {
		text: char,
		phoneme: char,
		viseme: 0,
		weightMs: DEFAULT_CHAR_DURATION_MS,
	};
};

const normalizeTimestamp = (value: number): number => Math.max(0, Math.round(value));

const buildCharacterTimings = (text: string, speed: number): CharacterTiming[] => {
	const bases = Array.from(text).map(getCharacterTimingBase);
	const estimatedDurationMs = Math.max(
		MIN_ALIGNMENT_DURATION_MS,
		bases.reduce((total, base) => total + base.weightMs, 0) / Math.max(0.1, speed),
	);
	const totalWeight = bases.reduce((total, base) => total + base.weightMs, 0) || 1;
	let cursorMs = 0;

	return bases.map((base, index) => {
		const isLast = index === bases.length - 1;
		const durationMs = isLast
			? estimatedDurationMs - cursorMs
			: (estimatedDurationMs * base.weightMs) / totalWeight;
		const startMs = cursorMs;
		const endMs = isLast ? estimatedDurationMs : cursorMs + durationMs;

		cursorMs = endMs;

		return {
			...base,
			startMs: normalizeTimestamp(startMs),
			endMs: normalizeTimestamp(endMs),
		};
	});
};

const buildWordTimestamps = (text: string, timings: CharacterTiming[]): TTSWordTimestamp[] => {
	const words: TTSWordTimestamp[] = [];
	const matches = Array.from(text.matchAll(/\S+/g));

	for (const match of matches) {
		const word = match[0];
		const startIndex = match.index ?? 0;
		const endIndex = startIndex + Array.from(word).length - 1;
		const startTiming = timings[startIndex];
		const endTiming = timings[endIndex];

		if (!startTiming || !endTiming) {
			continue;
		}

		words.push({
			word,
			startMs: startTiming.startMs,
			endMs: endTiming.endMs,
		});
	}

	return words;
};

export const buildEstimatedAudioAlignment = (
	text: string,
	speed: number,
): TTSAudioAlignment => {
	const timings = buildCharacterTimings(text, speed);
	const durationMs = timings.at(-1)?.endMs ?? 0;
	const phonemes: TTSPhonemeTimestamp[] = timings.map((timing) => ({
		text: timing.text,
		phoneme: timing.phoneme,
		startMs: timing.startMs,
		endMs: timing.endMs,
	}));
	const visemes: TTSVisemeTimestamp[] = timings.map((timing) => ({
		text: timing.text,
		viseme: timing.viseme,
		startMs: timing.startMs,
		endMs: timing.endMs,
	}));

	return {
		text,
		durationMs,
		words: buildWordTimestamps(text, timings),
		phonemes,
		visemes,
		source: "estimated",
	};
};
