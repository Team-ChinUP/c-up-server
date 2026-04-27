import type { RoomEntity } from "@/domain/room/entity";
import { prisma } from "@/global/config/prisma";

export const save = async (userId: number): Promise<RoomEntity> => {
	return prisma.room.create({
		data: { userId },
		select: { id: true, userId: true },
	});
};

export const findByUserId = async (userId: number): Promise<RoomEntity | null> => {
	return prisma.room.findUnique({
		where: { userId },
		select: { id: true, userId: true },
	});
};
