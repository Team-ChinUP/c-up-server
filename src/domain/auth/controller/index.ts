import { Router } from "express";
import type { ReissueRequestDto, SigninRequestDto, SignupRequestDto } from "@/domain/auth/dto/request";
import { reissue, signin, signup } from "@/domain/auth/service";
import { sendError } from "@/global/utils/error";
import { sendResponse } from "@/global/utils/response";

export const authRouter = Router();

export const signupController = async (req: { body: SignupRequestDto }, res: Parameters<typeof sendResponse>[0]) => {
    try {
        await signup(req.body);
        return sendResponse(res, 201, null, "sign-up success");
    } catch (error) {
        return sendError(res, 400, error);
    }
};

export const signinController = async (req: { body: SigninRequestDto }, res: Parameters<typeof sendResponse>[0]) => {
    try {
        const response = await signin(req.body);
        return sendResponse(res, 200, response, "sign-in success");
    } catch (error) {
        return sendError(res, 400, error);
    }
};

export const reissueController = async (req: { body: ReissueRequestDto }, res: Parameters<typeof sendResponse>[0]) => {
    try {
        const response = await reissue(req.body);
        return sendResponse(res, 200, response, "reissue success");
    } catch (error) {
        return sendError(res, 400, error);
    }
};

authRouter.post("/sign-up", signupController);
authRouter.post("/sign-in", signinController);
authRouter.post("/reissue", reissueController);