import request from "supertest";
import { getRepository, getConnection, SimpleConsoleLogger } from "typeorm";
import { seedAll } from "../seeds/seedStakePad";
import { PrivateLink } from "../models/PrivateLink";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { Company } from "../models/Company";
import {
  removeAllCollectionsData,
  BASE_TIMEOUT,
  BASE_URL,
  GOOD_PASSWORD,
  WEAK_PASSWORD,
  mockLogin,
} from "../utils/test";
import { response, Request } from "express";
import { ERR_TX_INVALID_OBJECT } from "web3";
import { parse } from "path";
import { log } from "console";
import { IRequest } from "../types/types";

describe("GET info routes", () => {
  beforeAll(async () => {
    await removeAllCollectionsData();
    await seedAll();

    // prep repositories and roles
    const userRepository = getRepository(User);
    const companyRepository = getRepository(Company);
    const roleRepository = getRepository(Role);

    // fetch roles
    const clientRole = await roleRepository.findOne({ name: "CLIENT" });
    const staffRole = await roleRepository.findOne({ name: "STAFF" });

    // fetch global stake company
    const globalStakeCompany = await companyRepository.findOne({
      name: "GlobalStake",
    });

    // add company and save it
    const newCompany = new Company();
    newCompany.name = "Quantum3Labs";
    newCompany.location = "Singapore";
    newCompany.website = "www.google.com";
    newCompany.walletAddress = "0x1";
    newCompany.slack = "null" || null;

    newCompany.rewardVault = "0x1";
    await companyRepository.save(newCompany);

    // register 4 users
    await request(BASE_URL).post("/auth/signup").send({
      email: "staff1@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "Staff1",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "staff2@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "Staff2",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "client1@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "client1",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "client2@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "client2",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "client3@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "client3",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "client4@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "client4",
    });

    // verified client without role without company
    const user = await userRepository.findOne({ email: "client1@gmail.com" });
    user!.isVerified = true;

    // verified client without role and with company
    const user2 = await userRepository.findOne({ email: "client2@gmail.com" });
    user2!.isVerified = true;
    user2!.company = newCompany;

    // verified client with role and with company
    const user3 = await userRepository.findOne({ email: "client3@gmail.com" });
    user3!.isVerified = true;
    user3!.company = newCompany;
    user3!.role = clientRole!;

    // verified client with role and without company
    const user4 = await userRepository.findOne({ email: "client4@gmail.com" });
    user4!.isVerified = true;
    user4!.role = staffRole!;

    // verified staff with role without company
    const staff1 = await userRepository.findOne({ email: "staff1@gmail.com" });
    staff1!.isVerified = true;
    staff1!.role = staffRole!;

    // verified staff with role and company
    const staff2 = await userRepository.findOne({ email: "staff2@gmail.com" });
    staff2!.isVerified = true;
    staff2!.role = staffRole!;
    staff2!.company = globalStakeCompany;

    // save all new added users
    await userRepository.save(user!);
    await userRepository.save(user2!);
    await userRepository.save(user3!);
    await userRepository.save(user4!);
    await userRepository.save(staff1!);
    await userRepository.save(staff2!);
  });
  afterAll(async () => {
    await getConnection().close();
  });
  it(
    "should get company details if user is STAFF or ADMIN",
    async () => {
      const bearerToken = await mockLogin("admin@gmail.com");
      const response = await request(BASE_URL)
        .get("/infos/companies/details")
        .set("Authorization", `Bearer ${bearerToken}`);
      const parsedResponse = JSON.parse(response.text);
      expect(response.statusCode).toBe(200);
      expect(parsedResponse.length).toBe(1);
      expect(parsedResponse[0].name).toBe("Quantum3Labs");
      expect(parsedResponse[0].location).toBe("Singapore");
      expect(parsedResponse[0].website).toBe("www.google.com");
    },
    BASE_TIMEOUT
  );
  it(
    "should fail to get company details if not STAFF nor ADMIN",
    async () => {
      const bearerToken = await mockLogin("client3@gmail.com");
      const response = await request(BASE_URL)
        .get("/infos/companies/details")
        .set("Authorization", `Bearer ${bearerToken}`);
      expect(response.body.message).toBe(
        "You don't have permission to perform this action."
      );
      expect(response.statusCode).toBe(403);
    },
    BASE_TIMEOUT
  );

  it(
    "should get company details if user is STAFF",
    async () => {
      const bearerToken = await mockLogin("staff1@gmail.com");
      const response = await request(BASE_URL)
        .get("/infos/companies/details")
        .set("Authorization", `Bearer ${bearerToken}`);
      const parsedResponse = JSON.parse(response.text);
      expect(response.statusCode).toBe(200);
      expect(parsedResponse.length).toBe(1);
      expect(parsedResponse[0].name).toBe("Quantum3Labs");
      expect(parsedResponse[0].location).toBe("Singapore");
      expect(parsedResponse[0].website).toBe("www.google.com");
    },
    BASE_TIMEOUT
  );

  it("shoul get users if ADMIN", async () => {
    const bearerToken = await mockLogin("admin@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/users")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(response.statusCode).toBe(200);
    expect(parsedResponse).toHaveLength(7);
    expect(parsedResponse[0].email).toBe("admin@gmail.com");
  });

  it("should get users if STAFF", async () => {
    const bearerToken = await mockLogin("staff1@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/users")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(response.statusCode).toBe(200);
    expect(parsedResponse).toHaveLength(7);
    expect(parsedResponse[0].email).toBe("admin@gmail.com");
  });

  it("should fail if STAFF get admin password", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/users")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(parsedResponse[0].password).not.toBeDefined();
  });

  it("should fail if client get users", async () => {
    const bearerToken = await mockLogin("client1@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/users")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "You don't have permission to perform this action."
    );
  });

  it("should fail if client get users", async () => {
    const bearerToken = await mockLogin("client3@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/users")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "You don't have permission to perform this action."
    );
  });

  it("should get current user if STAFF", async () => {
    const bearerToken = await mockLogin("staff1@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/getCurrentUser")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(parsedResponse.email).toBe("staff1@gmail.com");
    expect(parsedResponse.id).toBeDefined();
    expect(parsedResponse.name).toBe("Staff1");
    expect(parsedResponse.company).toEqual({});
    expect(parsedResponse.role).toBe("STAFF");
  });

  it("should get current user if client", async () => {
    const bearerToken = await mockLogin("client1@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/getCurrentUser")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(parsedResponse.email).toBe("client1@gmail.com");
    expect(parsedResponse.id).toBeDefined();
    expect(parsedResponse.name).toBe("client1");
    expect(parsedResponse.company).toEqual({});
    expect(parsedResponse.role).toBeUndefined();
  });

  // it ("should fail if user not found", async() => {
  //   const user = await getRepository(User).findOne({
  //     where: "emerson@gmail.com" ,
  //     relations: ["role"],
  //   });

  //   // const response = await request(BASE_URL).get("/infos/getCurrentUser").set("Authorization", `Bearer ${bearerToken}`)

  //   expect(user).toBeFalsy();
  //   // expect (response.body).toHaveProperty("message","User not found")
  // })

  it("should fail if client get companies names", async () => {
    const bearerToken = await mockLogin("client3@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/companies/names")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "You don't have permission to perform this action."
    );
  });

  it("should get companies name if ADMIN", async () => {
    const bearerToken = await mockLogin("admin@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/companies/names")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(response.statusCode).toBe(200);
    expect(parsedResponse.companies[0].name).toBe("globalstake");
    expect(parsedResponse.companies[1].name).toBe("Quantum3Labs");
  });

  it("should get companies names if STAFF", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/companies/names")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(response.statusCode).toBe(200);
    expect(parsedResponse.companies[0].name).toBe("globalstake");
    expect(parsedResponse.companies[1].name).toBe("Quantum3Labs");
  });

  it("should get company info if CLIENT", async () => {
    const bearerToken = await mockLogin("client3@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/company/:id")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(response.body).toHaveProperty(
      "message",
      "You are not authorized to view this company."
    );
  });

  it("should fail to get company info if client with no role", async () => {
    const bearerToken = await mockLogin("client1@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/company/:id")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);
    expect(response.body).toHaveProperty("message", "Unauthorized");
  });

  it("should fail if get companies names", async () => {
    const bearerToken = await mockLogin("client3@gmail.com");
    const response = await request(BASE_URL)
      .get("/infos/companies/names")
      .set("Authorization", `Bearer ${bearerToken}`);
    const parsedResponse = JSON.parse(response.text);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty(
      "message",
      "You don't have permission to perform this action."
    );
  });
});
