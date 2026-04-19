import type { UserEntity } from "@/domain/auth/entity";
import { prisma } from "@/global/lib/prisma";

export const save = async (user: UserEntity): Promise<void> => {
	await prisma.user.create({
		data: user,
	});
};

export const findByEmail = async (email: string): Promise<boolean> => {
	const user = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	return Boolean(user);
};

export const findOneByEmail = async (email: string): Promise<{ id: number; password: string } | null> => {
	return prisma.user.findUnique({
		where: { email },
		select: { id: true, password: true },
	});
};

export const updateNameByEmail = async (email: string, name: string): Promise<void> => {
	await prisma.user.update({
		where: { email },
		data: { name },
	});
};

export const deleteByEmail = async (email: string): Promise<void> => {
	await prisma.user.delete({
		where: { email },
	});
};
