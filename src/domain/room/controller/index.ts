import { Router } from "express";
import { getMyRoom, createMyRoom } from "@/domain/room/service";
import { sendError } from "@/global/utils/error";
import { sendResponse } from "@/global/utils/response";

export const roomRouter = Router();

export const createMyRoomController = async (
	_req: unknown,
	res: Parameters<typeof sendResponse>[0],
) => {
	try {
		const response = await createMyRoom(res.locals.userId as number);
		return sendResponse(res, 201, response, "room create success");
	} catch (error) {
		return sendError(res, 400, error);
	}
};

export const getMyRoomController = async (
	_req: unknown,
	res: Parameters<typeof sendResponse>[0],
) => {
	try {
		const response = await getMyRoom(res.locals.userId as number);
		return sendResponse(res, 200, response, "room get success");
	} catch (error) {
		return sendError(res, 400, error);
	}
};

roomRouter.post("/", createMyRoomController);
roomRouter.get("/me", getMyRoomController);
