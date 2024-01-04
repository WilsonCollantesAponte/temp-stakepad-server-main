import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Response } from "express";
import { getRepository } from "typeorm";
import { LoginRequest, SignUpRequestBody, IRequest } from "../types/types";
import { User } from "../models/User";
import { Company } from "../models/Company";
import {
  sendVerificationEmail,
  sendResetPasswordEmail,
  securePasswordPattern,
  ONE_HOUR_MS,
} from "../utils/email";

dotenv.config();

const SALT_ROUNDS = 10;

export const signUp = async (
  req: IRequest<SignUpRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const userRepository = getRepository(User);

    const { email, name, password, repeatPassword } = req.body;

    if (password !== repeatPassword) {
      res.status(400).send({ message: "Passwords do not match." });
      return;
    }

    if (securePasswordPattern.test(password) === false) {
      res.status(400).send({
        message:
          "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character.",
      });
      return;
    }

    const existingUser = await userRepository.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      res
        .status(400)
        .send({ message: "Email already registered and verified." });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = existingUser ?? new User();

    user.email = email;
    user.name = name;
    user.password = hashedPassword;
    user.emailVerificationToken = verificationToken;
    user.isVerified = false;
    user.profilePicturePath = "";

    await userRepository.save(user);
    await sendVerificationEmail(email, verificationToken);

    res.status(201).send({
      message: "User created successfully. Please verify your email.",
    });
  } catch (error) {
    console.error("Error in signUp: ", error);
    res.status(500).send({ message: "Internal server error." });
  }
};

export const login = async (
  req: LoginRequest,
  res: Response
): Promise<void> => {
  const userRepository = getRepository(User);
  const { email, password } = req.body;
  const user = await userRepository.findOne({ email }, { relations: ["role"] });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).send({ message: "Invalid email or password." });
    return;
  }
  if (!user.isVerified) {
    res.status(403).send({ message: "Please verify your email." });
    return;
  }
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET is not set");
  }

  const role = user.role?.name;
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.ACCESS_TOKEN_SECRET!
  );

  const decodedToken: any = jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET
  );
  user.loginLastIat = decodedToken.iat;

  await userRepository.save(user);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.status(200).send({ message: "Logged in successfully", role });
};

export const signOut = async (req: IRequest, res: Response): Promise<void> => {
  const token = req.token ?? req.cookies?.accessToken;

  if (token) {
    if (req.cookies?.accessToken) {
      res.clearCookie("accessToken");
    }

    res.status(200).send({ message: "Logged out successfully" });
  } else {
    res.status(401).send({ message: "Not authenticated" });
  }
};

export const forgotPassword = async (
  req: IRequest<{ email: string }>,
  res: Response
): Promise<void> => {
  const userRepository = getRepository(User);

  const { email } = req.body;

  const user = await userRepository.findOne({ email });

  if (!user) {
    res.status(404).send({ message: "No user found with that email address." });
    return;
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetToken = resetToken;
  user.resetTokenExpiry = new Date(Date.now() + ONE_HOUR_MS);

  await userRepository.save(user);

  sendResetPasswordEmail(email, resetToken);

  res.status(200).send({ message: "Password reset email sent." });
};

export const resetPassword = async (
  req: IRequest<{
    token: string;
    newPassword: string;
    confirmNewPassword: string;
  }>,
  res: Response
): Promise<void> => {
  const userRepository = getRepository(User);

  const { token, newPassword, confirmNewPassword } = req.body;

  if (newPassword !== confirmNewPassword) {
    res.status(400).send({ message: "Passwords do not match." });
    return;
  }

  if (securePasswordPattern.test(newPassword) === false) {
    res.status(400).send({
      message:
        "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character.",
    });
    return;
  }

  const user = await userRepository.findOne({ resetToken: token });

  if (!user || user.resetTokenExpiry! < new Date()) {
    res.status(400).send({ message: "Invalid or expired token." });
    return;
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  user.resetToken = null;
  user.resetTokenExpiry = null;
  await userRepository.save(user);

  res.status(200).send({ message: "Password reset successfully." });
};

export const verifyEmail = async (req: IRequest, res: Response) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send({ message: "Token is required." });
  }

  const userRepository = getRepository(User);
  const user = await userRepository.findOne({
    where: { emailVerificationToken: token },
  });

  if (!user) {
    return res.status(400).send({ message: "Invalid or expired token." });
  }

  try {
    user.isVerified = true;
    user.emailVerificationToken = null;
    await userRepository.save(user);
  } catch (error) {
    return res.status(500).send({ message: "Internal server error." });
  }

  return res.status(200).send({ message: "Email verified successfully." });
};
