import express, { Application } from "express";
import { createConnection, Connection } from "typeorm";
import bodyParser from "body-parser";
import authRoutes from "./routes/authRoutes";
import cookieParser from "cookie-parser";
import globalStakeRoutes from "./routes/managementRoutes";
import infoRoutes from "./routes/infoRoutes";
import { seedAll } from "./seeds/seedStakePad";
import { dbConfig } from "./db.config";
import dotenv from "dotenv";
import cors from "cors";
import { removeAllCollectionsData } from "./seeds/seedStakePad";

// Load environment variables from .env file
dotenv.config();

const app: Application = express();
const PORT: number = Number(process.env.PORT) || 3001;

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

if (!process.env.TEST) {
  app.use(cors(corsOptions));
}

// Database configuration based on the environment

// Database connection
createConnection(dbConfig as any)
  .then(async (connection: Connection) => {
    if (process.env.RESET) {
      await removeAllCollectionsData();
    }
    await seedAll();
  })
  .catch((error: Error) => console.log(error.message));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoints
app.use("/auth", authRoutes);
app.use("/management", globalStakeRoutes);
app.use("/infos", infoRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
