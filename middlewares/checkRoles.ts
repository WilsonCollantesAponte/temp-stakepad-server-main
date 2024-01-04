import { Response, NextFunction } from "express";
import { IRequest } from "../types/types";

// Middleware to check roles
export const checkRoles = (roles: string[]) => {
  return (req: IRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role; // Access role from req.user
    if (userRole && roles.includes(userRole)) {
      next();
    } else {
      res
        .status(403)
        .send({ message: "You don't have permission to perform this action." });
    }
  };
};
