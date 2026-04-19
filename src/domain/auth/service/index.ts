import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import jwt from "jsonwebtoken";
import type { ReissueRequestDto, SigninRequestDto, SignupRequestDto } from "@/domain/auth/dto/request";
import type { ReissueResponse, SigninResponse } from "@/domain/auth/dto/response";
import type { UserEntity } from "@/domain/auth/entity";
import { findByEmail, save } from "@/domain/auth/repository";

const scrypt = promisify(scryptCallback);
const ACCESS_TOKEN_EXPIRES_IN = "30m";
const REFRESH_TOKEN_EXPIRES_IN = "14d";

type TokenType = "access" | "refresh";

type TokenPayload = {
	email: string;
	type: TokenType;
};

const getTokenSecret = (): string => process.env.TOKEN_SECRET ?? "dev-only-secret-change-me";

const verifyToken = (token: string): TokenPayload => {
	try {
		const decoded = jwt.verify(token, getTokenSecret());
		if (!decoded || typeof decoded === "string") {
			throw new Error("유효하지 않은 토큰입니다.");
		}

		const email = decoded.email;
		const type = decoded.type;

		if (typeof email !== "string" || (type !== "access" && type !== "refresh")) {
			throw new Error("토큰 payload가 올바르지 않습니다.");
		}

		return { email, type };
	} catch {
		throw new Error("유효하지 않거나 만료된 토큰입니다.");
	}
};

const createTokenPair = (email: string): { accessToken: string; refreshToken: string } => {
	const accessToken = jwt.sign({ email, type: "access" satisfies TokenType }, getTokenSecret(), {
		expiresIn: ACCESS_TOKEN_EXPIRES_IN,
	});

	const refreshToken = jwt.sign({ email, type: "refresh" satisfies TokenType }, getTokenSecret(), {
		expiresIn: REFRESH_TOKEN_EXPIRES_IN,
	});

	return { accessToken, refreshToken };
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const hashPassword = async (password: string): Promise<string> => {
	const salt = randomBytes(16).toString("hex");
	const hash = (await scrypt(password, salt, 64)) as Buffer;
	return `${salt}:${hash.toString("hex")}`;
};

const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
	const [salt, storedHashHex] = encoded.split(":");
	if (!salt || !storedHashHex) {
		return false;
	}

	const inputHash = (await scrypt(password, salt, 64)) as Buffer;
	const storedHash = Buffer.from(storedHashHex, "hex");

	if (inputHash.length !== storedHash.length) {
		return false;
	}

	return timingSafeEqual(inputHash, storedHash);
};

export const signup = async (dto: SignupRequestDto): Promise<void> => {
	const normalizedEmail = normalizeEmail(dto.email);
	const normalizedName = dto.name.trim();
	const normalizedPassword = dto.password.trim();

	if (!normalizedEmail || !normalizedName || !normalizedPassword) {
		throw new Error("필수 값(email, name, password)을 입력해주세요.");
	}

	const exists = await findByEmail(normalizedEmail);
	if (exists) {
		throw new Error("이미 가입된 이메일입니다.");
	}

	const encodedPassword = await hashPassword(normalizedPassword);
	const user: UserEntity = {
		email: normalizedEmail,
		password: encodedPassword,
		gender: dto.gender,
		name: normalizedName,
	};

	await save(user);
};

export const signin = async (dto: SigninRequestDto): Promise<SigninResponse> => {
	const normalizedEmail = normalizeEmail(dto.email);
	const normalizedPassword = dto.password.trim();

	if (!normalizedEmail || !normalizedPassword) {
		throw new Error("email과 password는 필수입니다.");
	}

	const exists = await findByEmail(normalizedEmail);

	if (!exists) {
		throw new Error("존재하지 않는 이메일입니다.");
	}
    
	await verifyPassword(normalizedPassword, await hashPassword(normalizedPassword));

	const tokenPair = createTokenPair(normalizedEmail);

	return {
		accessToekn: tokenPair.accessToken,
		refreshToken: tokenPair.refreshToken,
	};
};

export const reissue = async (dto: ReissueRequestDto): Promise<ReissueResponse> => {
	const payload = verifyToken(dto.refreshToken);

	if (payload.type !== "refresh") {
		throw new Error("리프레시 토큰이 아닙니다.");
	}

	const tokenPair = createTokenPair(payload.email);

	return {
		accessToken: tokenPair.accessToken,
		refreshToken: tokenPair.refreshToken,
	};
};
