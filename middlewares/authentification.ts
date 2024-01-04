import { Response, NextFunction } from "express";
import { getRepository, Repository } from "typeorm";
import { User } from "../models/User";
import jwt from "jsonwebtoken";
import { IRequest, UserPayload } from "../types/types";
import dotenv from "dotenv";
import { LOGIN_EXPIRATION_MS } from "../utils/email";
dotenv.config();

export const authenticateToken = (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader && authHeader.split(" ")[1];
  const tokenFromCookie = req.cookies.accessToken;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return next();
  }

  jwt.verify(
    token,
    process.env.ACCESS_TOKEN_SECRET!,
    async (err: jwt.VerifyErrors | null, decoded: any) => {
      if (err) {
        return next();
      }
      if (decoded) {
        const decodedPayload = decoded as UserPayload;
        // check if loginLastIat is valid
        if (Date.now() / 1000 - decoded.iat > LOGIN_EXPIRATION_MS / 1000) {
          return next();
        }
        const user = await getRepository(User).findOne({
          email: decoded.email,
          loginLastIat: decoded.iat,
        });
        if (!user?.isVerified) {
          return res.status(401).send({ message: "Please verify your email" });
        }
        if (!user) {
          return next();
        }
        req.user = decodedPayload;
        req.token = token; // set token
        return next();
      } else {
        return next();
      }
    }
  );
};

export const requireClientToken = async (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const userRepository = getRepository(User);

  // First authenticate token without sending a response
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader && authHeader.split(" ")[1];
  const tokenFromCookie = req.cookies.accessToken;
  const token = tokenFromHeader || tokenFromCookie;

  let userWithRoles: User | undefined;

  if (token) {
    try {
      const decoded: any = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
      const decodedPayload = decoded as UserPayload;
      req.user = decodedPayload;

      userWithRoles = await userRepository.findOne({
        where: { id: decodedPayload.id },
        relations: ["role"],
      });

      if (!userWithRoles) {
        return res.status(401).send({ message: "User not found" });
      }

      if (!userWithRoles.isVerified) {
        return res.status(401).send({ message: "Please verify your email" });
      }
    } catch (err) {
      return res.status(401).send({ message: "Invalid token" });
    }
  }

  // Role-based checks
  if (userWithRoles?.role?.name === "CLIENT") {
    next();
  } else if (["STAFF", "ADMIN"].includes(userWithRoles?.role?.name || "")) {
    next();
  } else {
    return res.status(401).send({ message: "Unauthorized" });
  }
};
