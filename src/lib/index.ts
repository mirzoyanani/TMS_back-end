import bcrypt from "bcrypt";
import nodemailer, { Transporter } from "nodemailer";
import { Request } from "express";

export interface ResponseTemplate {
  meta: {
    error: {
      code: number | null;
      message: string | null;
    } | null;
    status: number;
  };
  data: Record<string, unknown>;
}

export function getResponseTemplate(): ResponseTemplate {
  return {
    meta: {
      error: null,
      status: 200,
    },
    data: {},
  };
}

export async function hashingString(password: string): Promise<string> {
  try {
    const hashSalt: string = await bcrypt.genSalt(10);
    const hashedStr: string = await bcrypt.hash(password + "", hashSalt);
    return hashedStr;
  } catch (err) {
    throw {
      errCode: 500,
      message: err || "Հեշավորումը ավարտվեց անհաջողությամբ",
    };
  }
}

interface MailConfig {
  email: string;
  emailPassword: string;
}

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(email: string, subject: string, content: number | string): Promise<void> {
  const mailConfig: MailConfig = {
    email: process.env.MY_GOOGLE_MAIL_NAME || "",
    emailPassword: process.env.MY_GOOGLE_MAIL_PASSWORD || "",
  };

  const transporter: Transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: mailConfig.email,
      pass: mailConfig.emailPassword,
    },
  });

  const mailOptions: MailOptions = {
    from: mailConfig.email,
    to: email,
    subject,
    text: content + " ",
  };

  await transporter.sendMail(mailOptions);
}

export interface CustomRequest extends Request {
  decoded?: {
    code: string;
    uid: string;
  };
}

export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const phoneNumberPattern: RegExp = /^\+374 \d{8}$/;
  return phoneNumberPattern.test(phoneNumber);
};
