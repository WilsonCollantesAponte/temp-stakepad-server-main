import { Router } from "express";
import {
  signUp,
  login,
  signOut,
  forgotPassword,
  resetPassword,
  verifyEmail,
} from "../controllers/authController";

const router = Router();

router.post("/signup", signUp);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/logout", signOut);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
