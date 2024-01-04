import { Router } from "express";
import {
  getCompanyDetails,
  getCompanyNames,
  getCompanyInfo,
} from "../controllers/companyController";
import { getUsers, getCurrentUser } from "../controllers/globalStakeController";
import { checkRoles } from "../middlewares/checkRoles";
import {
  authenticateToken,
  requireClientToken,
} from "../middlewares/authentification";
import { getPrivateLinkData } from "../controllers/globalStakeController";

const router = Router();

router.get(
  "/companies/details",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  getCompanyDetails
);
router.get(
  "/users",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  getUsers
);
router.get("/getCurrentUser", authenticateToken, getCurrentUser);
router.get(
  "/companies/names",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  getCompanyNames
);
router.get("/company/:id", requireClientToken, getCompanyInfo);
router.get("/getLink", getPrivateLinkData);

export default router;
