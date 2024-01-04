import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_EMAIL_HOST,
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  transporter.sendMail({
    from: '"Your Company <noreply@yourcompany.com>',
    to: email,
    subject: "Please verify your email",
    text: `Click on the link to verify your email: ${verificationLink}`,
    html: `<a href="${verificationLink}">Click here to verify your email</a>`,
  });
}

export async function sendResetPasswordEmail(email: string, token: string) {
  const resetPasswordLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  transporter.sendMail({
    from: '"Your Company <noreply@yourcompany.com>',
    to: email,
    subject: "Password Reset Request",
    text: `You have requested a password reset. Please click on the following link to reset your password: ${resetPasswordLink}`,
    html: `<p>You have requested a password reset. Please click on the following link to reset your password:</p><a href="${resetPasswordLink}">Reset Password</a>`,
  });
}

export const securePasswordPattern =
  /^(?=.*[0-9])(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-])(?=.*[a-z])(?=.*[A-Z])[A-Za-z0-9!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]{8,}$/;

export const ONE_HOUR_MS = 1000 * 60 * 60;

export const HALF_DAY_MS = ONE_HOUR_MS * 12;

export const ONE_DAY_MS = ONE_HOUR_MS * 24;

export const LOGIN_EXPIRATION_MS = HALF_DAY_MS;
