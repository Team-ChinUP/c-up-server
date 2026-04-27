import jwt from "jsonwebtoken";

export type AccessTokenPayload = {
	email: string;
	type: "access";
};

const getTokenSecret = (): string => process.env.TOKEN_SECRET ?? "dev-only-secret-change-me";

export const extractBearerToken = (authorization?: string): string => {
	if (!authorization) {
		throw new Error("Authorization header가 필요합니다.");
	}

	const [scheme, token] = authorization.split(" ");

	if (scheme !== "Bearer" || !token) {
		throw new Error("Authorization header 형식이 올바르지 않습니다.");
	}

	return token;
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
	try {
		const decoded = jwt.verify(token, getTokenSecret());

		if (!decoded || typeof decoded === "string") {
			throw new Error("유효하지 않은 토큰입니다.");
		}

		const email = decoded.email;
		const type = decoded.type;

		if (typeof email !== "string" || type !== "access") {
			throw new Error("액세스 토큰이 아닙니다.");
		}

		return { email, type };
	} catch {
		throw new Error("유효하지 않거나 만료된 토큰입니다.");
	}
};
