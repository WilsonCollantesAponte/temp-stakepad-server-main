import { Request, Response, NextFunction } from "express";
import { getRepository } from "typeorm";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { PrivateLink } from "../models/PrivateLink";
import { Company } from "../models/Company";
import { IRequest } from "../types/types";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

export const assignRoles = async (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const userRepository = getRepository(User);
  const roleRepository = getRepository(Role);

  const roleToAssignId = Number(req.body.roleToAssignId);
  const userToAssignId = Number(req.body.userToAssignId);

  // Load the ADMIN role ID from the database
  const adminRole = await roleRepository.findOne({ where: { name: "ADMIN" } });
  if (!adminRole) {
    return res.status(500).send({ message: "ADMIN role not found." });
  }

  const requester = await userRepository.findOne({
    where: { id: req.user?.id },
    relations: ["role"],
  });

  const roleToAssign = await roleRepository.findOne({ id: roleToAssignId });
  const userToAssign = await userRepository.findOne({
    where: { id: userToAssignId },
    relations: ["role"],
  });
  if (!requester || !roleToAssign || !userToAssign) {
    return res.status(404).send({ message: "Role or user not found." });
  }

  if (roleToAssignId === adminRole.id) {
    return res.status(403).send({ message: "You can't assign Admin role." });
  }

  // Prevent ADMIN from modifying their own role
  if (requester.role.id === adminRole.id && requester.id === userToAssignId) {
    return res
      .status(403)
      .send({ message: "Admin cannot modify their own role." });
  }

  if (requester.role.id === adminRole.id) {
    userToAssign.role = roleToAssign;
  } else if (requester.role.name === "STAFF") {
    if (userToAssign.role) {
      return res.status(403).send({
        message: "STAFF can only modify users with no existing role.",
      });
    }
    if (roleToAssign.name !== "CLIENT") {
      return res
        .status(403)
        .send({ message: "STAFF can only assign the CLIENT role." });
    }
    userToAssign.role = roleToAssign;
  } else {
    return res
      .status(403)
      .send({ message: "You don't have permission to assign roles." });
  }
  await userRepository.save(userToAssign);
  return res.status(200).send({ message: "Role assigned successfully." });
};

export const getUsers = async (req: IRequest, res: Response) => {
  const userRepository = getRepository(User);
  const users = await userRepository.find({ relations: ["role", "company"] }); // This should load the role and company relations
  const safeUsers = users.map((user) => {
    const { password, ...safeUser } = user;
    return safeUser;
  });
  return res.json(safeUsers);
};

export const getUserDetails = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const userRepository = getRepository(User);
  const user = await userRepository.findOne(userId);
  if (user) {
    res.json(user);
  } else {
    res.status(404).send({ message: "User not found" });
  }
};

export const getCurrentUser = async (req: IRequest, res: Response) => {
  const userRepository = getRepository(User);

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).send({ message: "Not authenticated" });
  }

  const user = await userRepository.findOne(userId, {
    relations: ["role", "company"],
  });

  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }

  const { password, ...safeUser } = user;

  const { role, company } = safeUser;

  const userData = {
    ...safeUser,
    role: role?.name,
    company: {
      id: company?.id,
      name: company?.name,
      location: company?.location,
      walletAddress: company?.walletAddress,
      website: company?.website,
      slack: company?.slack,
      rewardvault: company?.rewardVault,
    },
  };

  return res.status(200).send(userData);
};

export const generateLink = async (req: IRequest, res: Response) => {
  const { validators, client } = req.body;

  if (!validators || !client) {
    return res
      .status(400)
      .json({ message: "Both validators and client fields are required." });
  }

  try {
    // Fetch the company by its wallet address
    const companyRepository = getRepository(Company);
    const company = await companyRepository.findOne({
      where: { walletAddress: client },
    });

    if (!company) {
      return res.status(400).json({
        message: "Company with the provided wallet address not found.",
      });
    }

    // Hashing the private link for security
    const saltRounds = 10;
    const hashedLink = await bcrypt.hash(client, saltRounds);

    const privateLink = new PrivateLink();
    privateLink.receiverAddress = hashedLink;
    privateLink.fundValidatorTxData = validators;
    privateLink.client = company; // Setting the company to the privateLink
    privateLink.used = false;

    const privateLinkRepository = getRepository(PrivateLink);
    const newLink = await privateLinkRepository.save(privateLink);

    const linkToken = jwt.sign(
      { linkId: newLink.id },
      process.env.ACCESS_TOKEN_SECRET!
    );

    return res
      .status(201)
      .json({ message: "Link generated successfully.", linkToken });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An error occurred while generating the link.", error });
  }
};

export const getPrivateLinkData = async (req: IRequest, res: Response) => {
  const authHeader = req.headers["authorization"];
  const tokenFromHeader = authHeader && authHeader.split(" ")[1];
  const tokenFromCookie = req.cookies.accessToken;
  const token = tokenFromHeader || tokenFromCookie;

  if (!token) {
    return res.status(400).json({ message: "Token is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    const { linkId } = decoded as any;
    const privateLinkRepository = getRepository(PrivateLink);

    const linkData = await privateLinkRepository.findOne(linkId, {
      relations: ["client"],
      select: ["id", "receiverAddress", "fundValidatorTxData"],
    });

    if (!linkData) {
      return res.status(404).json({ message: "Link not found." });
    }

    // Prepare the response data
    const response = {
      id: linkData.id,
      receiverAddress: linkData.receiverAddress,
      fundValidatorTxData: linkData.fundValidatorTxData,
      clientId: linkData.client ? linkData.client.id : null,
    };

    return res.status(200).json({
      message: "Link data retrieved successfully",
      linkData: response,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while fetching the link data.",
      error,
    });
  }
};

export const removeUser = async (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const userRepository = getRepository(User);

  const userId = Number(req.params.id);

  try {
    const userToRemove = await userRepository.findOne(userId, {
      relations: ["role"],
    });
    const requestingUser = await userRepository.findOne(req.user?.id, {
      relations: ["role"],
    });

    if (!userToRemove || !requestingUser) {
      return res.status(404).send({ message: "User not found." });
    }

    // Constraints
    if (
      requestingUser.role &&
      requestingUser.role.name === "ADMIN" &&
      userToRemove.role.name === "ADMIN"
    ) {
      return res
        .status(403)
        .send({ message: "Admin cannot delete themselves." });
    }

    if (requestingUser.role && requestingUser.role.name === "STAFF") {
      if (
        userToRemove.role.name === "STAFF" ||
        userToRemove.id === requestingUser.id
      ) {
        return res
          .status(403)
          .send({ message: "Staff cannot delete themselves or other staff." });
      }
      if (userToRemove.role.name === "ADMIN") {
        return res
          .status(403)
          .send({ message: "Staff cannot delete an admin." });
      }
    }
    // TODO : Update members field of company linked to this user
    await userRepository.remove(userToRemove);
    return res.status(200).send({ message: "User removed successfully." });
  } catch (error) {
    next(error);
  }
};

export const deletePrivateLink = async (req: IRequest, res: Response) => {
  const { id } = req.params;

  try {
    // Check if the PrivateLink record exists and is eligible for deletion
    const privateLinkRepository = getRepository(PrivateLink);
    const privateLink = await privateLinkRepository.findOne(id);

    if (!privateLink) {
      return res.status(404).json({ message: "PrivateLink not found." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if the user has the required role (ADMIN or STAFF)
    if (!["CLIENT"].includes(req.user.role)) {
      return res.status(403).json({ message: "Permission denied." });
    }

    // Delete the PrivateLink record
    await privateLinkRepository.remove(privateLink);

    // Return a "deleted" message
    return res
      .status(200)
      .json({ message: "PrivateLink deleted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error." });
  }
};
