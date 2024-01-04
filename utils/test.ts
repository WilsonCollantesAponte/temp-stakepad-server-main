import { getRepository, createConnection } from "typeorm";
import { dbConfig } from "../db.config";
import { PrivateLink } from "../models/PrivateLink";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Company } from "../models/Company";
import jwt from "jsonwebtoken";

export const BASE_TIMEOUT = 150000;

export const removeAllCollectionsData = async () => {
  await createConnection(dbConfig as any);
  await getRepository(PrivateLink).delete({});
  await getRepository(User).delete({});
  await getRepository(Role).delete({});
  await getRepository(Company).delete({});
};

export const mockLogin = async (email: string) => {
  const userRepository = getRepository(User);
  const user = await getRepository(User).findOne({
    where: { email },
    relations: ["role"],
  });
  if (!user) {
    throw "User not found";
  }
  const role = user.role?.name;
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role },
    process.env.ACCESS_TOKEN_SECRET!
  );
  // Decode the JWT to access the 'iat' claim
  const decodedToken: any = jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET!
  );
  user.loginLastIat = decodedToken.iat;
  await userRepository.save(user);
  return accessToken;
};

export const BASE_URL = "http://localhost:3001";

export const GOOD_PASSWORD = "GoodP@ssw0rd";
export const WEAK_PASSWORD = "weak";
