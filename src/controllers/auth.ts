import { getResponseTemplate, ResponseTemplate, hashingString, sendEmail } from "../lib/index.js";
import { UserInfoDTO } from "../lib/index.js";
import { v4 as uuid } from "uuid";
import { Request, Response } from "express";
import {
  _WRONG_LOGIN_OR_PASSWORD,
  _RESET_CODE_IS_WRONG_,
  _USER_NOT_FOUND_,
  _WRONG_TELEPHONE_NUMBER_,
  _EMAIL_EXISTS_,
} from "../helpers/err-codes.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { registerUser, getCurrentUserByEmailorId, updatePassword, isEmailInUse } from "../db/auth.js";
import { CustomRequest } from "../lib/index.js";
import { isValidPhoneNumber } from "../lib/index.js";

export const registerController = async (req: Request<unknown, unknown, UserInfoDTO>, res: Response): Promise<void> => {
  const result: ResponseTemplate = getResponseTemplate();
  try {
    const payload = req.body;
    payload.uid = uuid();
    payload.profilePicture = req.file?.filename;
    payload.password = await hashingString(payload.password);
    if (!isValidPhoneNumber(payload.telephone)) {
      throw _WRONG_TELEPHONE_NUMBER_;
    }
    const emailExists = await isEmailInUse(payload.email);

    if (emailExists) {
      throw _EMAIL_EXISTS_;
    }
    await registerUser(payload);
    result.data.message = "User registered successfully";
  } catch (err: any) {
    result.meta.error = {
      code: err.code || 500,
      message: err.message || "Unknown Error",
    };
    result.meta.status = err.status || 500;
  }
  res.status(result.meta.status).json(result);
};

interface LoginDto {
  email: string;
  password: string;
}

export const loginController = async (req: Request<unknown, unknown, LoginDto>, res: Response): Promise<void> => {
  const result: ResponseTemplate = getResponseTemplate();
  try {
    const payload = req.body;

    const currentUser = await getCurrentUserByEmailorId(payload.email);

    if (!currentUser) {
      throw _WRONG_LOGIN_OR_PASSWORD;
    }

    const isPasswordCorrect = await bcrypt.compare(payload.password, currentUser.password);

    if (!isPasswordCorrect) {
      throw _WRONG_LOGIN_OR_PASSWORD;
    }

    const token: string = jwt.sign({ uid: currentUser.uid }, process.env.SECRET_KEY as string, {
      expiresIn: 60 * 60 * 24 * 365,
    });

    result.data.token = token;
  } catch (err: any) {
    result.meta.error = {
      code: err.code || err.errCode || 5000,
      message: err.message || err.errMessage || "Unknown Error",
    };
    result.meta.status = err.status || err.statusCode || 500;
  }

  res.status(result.meta.status).json(result);
};

interface ForgetPasswordDTO {
  email: string;
}
export const forgetPasswordController = async (
  req: Request<unknown, unknown, ForgetPasswordDTO>,
  res: Response,
): Promise<void> => {
  const result: ResponseTemplate = getResponseTemplate();
  try {
    const payload = req.body;
    const currentUser = await getCurrentUserByEmailorId(payload.email);

    if (!currentUser) {
      throw _USER_NOT_FOUND_;
    }

    const randomCode = Math.floor(Math.random() * (100000 - 999999 + 1)) + 999999;

    const codeForJwt = await hashingString(randomCode.toString());

    const token = jwt.sign(
      {
        uid: currentUser.uid,
        code: codeForJwt,
      },
      process.env.SECRET_KEY as string,
      { expiresIn: 60 * 60 * 24 * 365 },
    );

    await sendEmail(req.body.email, "RESET CODE", randomCode);

    result.data.token = token;
  } catch (err: any) {
    result.meta.error = {
      code: err.code || err.errCode || 5000,
      message: err.message || err.errMessage || "Unknown Error",
    };
    result.meta.status = err.status || err.statusCode || 500;
  }
  res.status(result.meta.status).json(result);
};

interface CodeDTO {
  code: string;
}
export const checkCodeController = async (req: CustomRequest<CodeDTO, unknown>, res: Response): Promise<void> => {
  const result: ResponseTemplate = getResponseTemplate();
  try {
    const { code } = req.body;

    if (!req.decoded || !req.decoded.code) {
      throw new Error("Սխալ հարցում");
    }
    const compared = await bcrypt.compare(code, req.decoded.code);

    if (!compared) {
      throw _RESET_CODE_IS_WRONG_;
    }
    const currentUser = await getCurrentUserByEmailorId("", req.decoded.uid);

    if (!currentUser) {
      throw { status: 406, message: "Wrong params" };
    }

    const newToken = jwt.sign(
      {
        uid: currentUser.uid,
      },
      process.env.SECRET_KEY as string,
      { expiresIn: 60 * 60 * 24 * 365 },
    );

    result.data.token = newToken;
  } catch (err: any) {
    result.meta.error = {
      code: err.code || err.errCode || 5000,
      message: err.message || err.errMessage || "Unknown Error",
    };
    result.meta.status = err.status || err.statusCode || 500;
  }

  res.status(result.meta.status).json(result);
};
interface PasswordDTO {
  password: string;
}
export const resetPasswordController = async (
  req: CustomRequest<PasswordDTO, unknown>,
  res: Response,
): Promise<void> => {
  const result: ResponseTemplate = getResponseTemplate();
  try {
    if (!req.decoded) {
      throw new Error("Սխալ հարցում");
    }

    const newPassword = await hashingString(req.body.password);
    updatePassword(newPassword, req.decoded.uid);

    result.data.message = "Request has ended successfully";
  } catch (err: any) {
    result.meta.error = {
      code: err.code || err.errCode || 5000,
      message: err.message || err.errMessage || "Unknown Error",
    };
    result.meta.status = err.status || err.statusCode || 500;
  }

  res.status(result.meta.status).json(result);
};
