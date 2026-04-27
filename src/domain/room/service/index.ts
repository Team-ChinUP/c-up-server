import { Prisma } from "@prisma/client";
import type { MyRoomResponseDto } from "@/domain/room/dto/response";
import { findByUserId, save } from "@/domain/room/repository";
export const createMyRoom = async (userId: number): Promise<MyRoomResponseDto> => {
	const exists = await findByUserId(userId);

	if (exists) {
		throw new Error("이미 생성된 room이 있습니다.");
	}

	let room;
	try {
		room = await save(userId);
	} catch (error) {
		if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
			throw new Error("이미 생성된 room이 있습니다.");
		}

		throw error;
	}

	return {
		roomId: room.id,
	};
};

export const getMyRoom = async (userId: number): Promise<MyRoomResponseDto> => {
	const room = await findByUserId(userId);

	if (!room) {
		throw new Error("생성된 room이 없습니다.");
	}

	return {
		roomId: room.id,
	};
};
