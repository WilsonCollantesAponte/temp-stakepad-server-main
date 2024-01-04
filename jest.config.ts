import type { Config } from "@jest/types";

const baseDir = "<rootDir>";
const baseTestDir = "<rootDir>/test";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
  testMatch: [`${baseTestDir}/*.ts`],
};

export default config;
