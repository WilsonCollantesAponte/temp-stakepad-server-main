import { Company } from "./models/Company";
import { PrivateLink } from "./models/PrivateLink";
import { Role } from "./models/Role";
import { User } from "./models/User";
import dotenv from "dotenv";

dotenv.config();

export const dbConfig = {
  type: "mysql",
  driver: require("mysql2"),
  synchronize: true,
  entities: [Company, PrivateLink, Role, User],
  ssl: {
    rejectUnauthorized: false,
  },
};

Object.assign(dbConfig, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
