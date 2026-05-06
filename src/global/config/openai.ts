import OpenAI from "openai";

const apiKey = process.env.OPEN_AI_KEY;

if (!apiKey) {
	throw new Error("OPEN_AI_KEY environment variable is required");
}

export const openai = new OpenAI({
	apiKey,
});
