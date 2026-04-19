import type { Gender } from "@/domain/auth/entity";

export type SigninRequestDto = {
	email: string;
	password: string;
};

export type SignupRequestDto = {
	email: string;
	password: string;
	name: string;
	gender: Gender;
};

export type ReissueRequestDto = {
	refreshToken: string;
};
