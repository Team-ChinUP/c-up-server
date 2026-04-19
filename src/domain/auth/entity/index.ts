export type Gender = "MALE" | "FEMALE";

export type UserEntity = {
	email: string;
	password: string;
	gender: Gender;
	name: string;
};
