import { Request } from "express";

// Auth-related types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface IEnv {
  DEFAULT_COMPANY_NAME?: string;
}

export interface SignUpRequestBody extends AuthCredentials {
  name: string;
  repeatPassword: string;
  companyName: string;
}

export type LoginRequestBody = AuthCredentials;

// User-related types
interface UserBase {
  id?: number;
  email: string;
  loginLastIat?: number;
}

export interface UserPayload extends UserBase {
  role: string;
}

// Validator-related types
interface FundValidatorTxData {
  pubkey: string;
  withdrawalcredentials: string;
  signature: string;
  depositDataRoot: string;
}

export type ValidatorRequestBody = {
  fundValidatorTxData: FundValidatorTxData[];
};

// Company-related types
export interface UpdateRewardVaultRequestBody {
  companyId: number;
  rewardVault: string;
}

// Standard IRequest for general use-cases
export interface IRequest<T = any> extends Request {
  user?: UserPayload & { token?: string }; // add token here
  isAuthorized?: boolean;
  companyId?: number;
  token?: string;
  body: T;
}

// Request types based on IRequest
export type SignUpRequest = IRequest<SignUpRequestBody>;
export type LoginRequest = IRequest<LoginRequestBody>;
export type ValidatorRequest = IRequest<ValidatorRequestBody>;
