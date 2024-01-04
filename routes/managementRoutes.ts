import { Router } from "express";
import { authenticateToken } from "../middlewares/authentification";
import { checkRoles } from "../middlewares/checkRoles";
import {
  assignRoles,
  generateLink,
  removeUser,
  deletePrivateLink,
} from "../controllers/globalStakeController";
import {
  addCompany,
  removeCompany,
  editCompany,
  updateRewardVault,
  assignCompany,
} from "../controllers/companyController";

const router = Router();

router.post(
  "/assign-roles",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  assignRoles
);
router.post(
  "/add-company",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  addCompany
);
router.post(
  "/assignCompany",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  assignCompany
);
router.delete(
  "/remove-company/:id",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  removeCompany
);
router.put(
  "/edit-company/:id",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  editCompany
);
router.post(
  "/reward-vault",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  updateRewardVault
);
router.post(
  "/generate-link",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  generateLink
);
router.delete("/delete-privatelink/:id", authenticateToken, deletePrivateLink);
router.delete(
  "/remove-user/:id",
  authenticateToken,
  checkRoles(["ADMIN", "STAFF"]),
  removeUser
);

export default router;
