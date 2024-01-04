import request from "supertest";
import { getRepository, getConnection } from "typeorm";
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
import e from "express";

// fetch roles
let clientRole: any;
let staffRole: any;
let adminRole: any;
let globalStakeCompany: any;
let newCompany: any;
let newCompany2: any;
let client1: any;
let client2: any;
let client3: any;
let staff1: any;
let staff2: any;
let staff3: any;
let linkToken1: any;
let linkToken2: any;
let linkData1: any;
let linkData2: any;

const sampleValidatorTxData = {
  pubkey: "nothing",
  withdrawalcredentials: "nothing",
  signature: "nothing",
  depositDataRoot: "nothing",
};

const sampleValidatorTxData2 = {
  pubkey: "nothing2",
  withdrawalcredentials: "nothing2",
  signature: "nothing2",
  depositDataRoot: "nothing2",
};

const updateUsers = async () => {
  const userRepository = getRepository(User);
  client1 = await userRepository.findOne(
    {
      email: "client1@gmail.com",
    },
    { relations: ["role", "company"] }
  );

  client2 = await userRepository.findOne(
    {
      email: "client2@gmail.com",
    },
    { relations: ["role", "company"] }
  );

  client3 = await userRepository.findOne(
    {
      email: "client3@gmail.com",
    },
    { relations: ["role", "company"] }
  );

  staff1 = await userRepository.findOne(
    {
      email: "staff1@gmail.com",
    },
    { relations: ["role", "company"] }
  );

  staff2 = await userRepository.findOne(
    { email: "staff2@gmail.com" },
    { relations: ["role", "company"] }
  );
  staff3 = await userRepository.findOne(
    { email: "staff3@gmail.com" },
    { relations: ["role", "company"] }
  );
};

const updateCompanies = async () => {
  const companyRepository = getRepository(Company);
  globalStakeCompany = await companyRepository.findOne(
    { name: "GlobalStake" },
    { relations: ["members"] }
  );
  newCompany = await companyRepository.findOne(
    { name: "Quantum3Labs" },
    { relations: ["members"] }
  );
  newCompany2 = await companyRepository.findOne(
    { name: "Google" },
    { relations: ["members"] }
  );
};

describe("Management", () => {
  beforeAll(async () => {
    await removeAllCollectionsData();
    await seedAll();

    // prep repositories and roles
    const userRepository = getRepository(User);
    const companyRepository = getRepository(Company);
    const roleRepository = getRepository(Role);
    clientRole = await roleRepository.findOne({ name: "CLIENT" });
    staffRole = await roleRepository.findOne({ name: "STAFF" });
    adminRole = await roleRepository.findOne({ name: "ADMIN" });
    // fetch global stake company
    globalStakeCompany = await companyRepository.findOne({
      name: "GlobalStake",
    });

    // add 2 companies and save it
    newCompany = new Company();
    newCompany.name = "Quantum3Labs";
    newCompany.location = "Singapore";
    newCompany.website = "www.quantum3labs.com";
    newCompany.walletAddress = "0x1";
    newCompany.slack = "null" || null;
    newCompany.rewardVault = "0x1";

    newCompany2 = new Company();
    newCompany2.name = "Google";
    newCompany2.location = "United States";
    newCompany2.website = "www.google.com";
    newCompany2.walletAddress = "0x2";
    newCompany2.slack = "null" || null;
    newCompany2.rewardVault = "0x2";

    await companyRepository.save(newCompany);
    await companyRepository.save(newCompany2);

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
      email: "staff3@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "Staff3",
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

    await updateUsers();

    client2!.isVerified = true;
    client3!.isVerified = true;
    staff2!.isVerified = true;
    staff3!.isVerified = true;

    // save all new modified users
    await userRepository.save(client2!);
    await userRepository.save(staff2!);
    await userRepository.save(client3!);
    await userRepository.save(staff3!);
  });
  afterAll(async () => {
    await getConnection().close();
  });
  it(
    "Assign Role ADMIN -> (non)verified STAFF",
    async () => {
      // verified staff
      let bearerToken = await mockLogin("admin@gmail.com");
      let response = await request(BASE_URL)
        .post("/management/assign-roles")
        .set("Authorization", `Bearer ${bearerToken}`)
        .send({
          roleToAssignId: staffRole!.id,
          userToAssignId: staff2!.id,
        });
      expect(staff2!.isVerified).toBe(true);
      await updateUsers();
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Role assigned successfully.");
      expect(staff2!.role.name).toBe("STAFF");

      // nonverified --> staff
      bearerToken = await mockLogin("admin@gmail.com");
      response = await request(BASE_URL)
        .post("/management/assign-roles")
        .set("Authorization", `Bearer ${bearerToken}`)
        .send({
          roleToAssignId: staffRole!.id,
          userToAssignId: staff1!.id,
        });
      expect(staff1!.isVerified).toBe(false);
      await updateUsers();
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Role assigned successfully.");
      expect(staff1!.role.name).toBe("STAFF");
    },
    BASE_TIMEOUT
  );
  it("Assign Role fails if wrong role id or user id", async () => {
    // wrong user id
    let bearerToken = await mockLogin("admin@gmail.com");
    let response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: staffRole!.id,
        userToAssignId: staff3!.id + 10000,
      });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Role or user not found.");

    //wrong role id
    bearerToken = await mockLogin("admin@gmail.com");
    response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: staffRole!.id + 10000000,
        userToAssignId: staff3!.id,
      });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Role or user not found.");
  });

  it("Assign Role STAFF -> ADMIN fails", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: adminRole!.id,
        userToAssignId: staff3!.id,
      });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe("You can't assign Admin role.");
  });
  it("Assign Role STAFF -> STAFF fails", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: staffRole!.id,
        userToAssignId: staff3!.id,
      });
    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe(
      "STAFF can only assign the CLIENT role."
    );
  });
  it("Assign Role CLIENT -> ADMIN / STAFF fails", async () => {
    const bearerToken = await mockLogin("client2@gmail.com");
    let response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: staffRole!.id,
        userToAssignId: staff3!.id,
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe(
      "You don't have permission to perform this action."
    );

    response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: adminRole!.id,
        userToAssignId: staff3!.id,
      });

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toBe(
      "You don't have permission to perform this action."
    );
  });

  it("Assign company without role should fail", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .post("/management/assignCompany")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: newCompany!.id,
        userToAssignId: client1!.id,
      });
    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User does not have a role.");
  });

  it("Assign company updates data correctly", async () => {
    // unverified staff
    let bearerToken = await mockLogin("admin@gmail.com");
    let response = await request(BASE_URL)
      .post("/management/assignCompany")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: globalStakeCompany!.id,
        userToAssignId: staff1!.id,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Company assigned successfully.");

    //verified staff
    bearerToken = await mockLogin("admin@gmail.com");
    response = await request(BASE_URL)
      .post("/management/assignCompany")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: globalStakeCompany!.id,
        userToAssignId: staff2!.id,
      });
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Company assigned successfully.");

    response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: clientRole!.id,
        userToAssignId: client2!.id,
      });

    response = await request(BASE_URL)
      .post("/management/assignCompany")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: newCompany!.id,
        userToAssignId: client2!.id,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Company assigned successfully.");

    // check data is correct in db
    await updateUsers();
    expect(staff1!.company!.name).toBe("globalstake");
    expect(staff2!.company!.name).toBe("globalstake");

    await updateCompanies();
    expect(globalStakeCompany!.members.length).toBe(3);
    expect(globalStakeCompany!.members[1].name).toBe("Staff1");
    expect(globalStakeCompany!.members[2].name).toBe("Staff2");
  });

  it(
    "Assign Role STAFF / ADMIN -> (non)verified CLIENT",
    async () => {
      // should fail if staff is not verified
      let bearerToken = await mockLogin("staff1@gmail.com");
      let response = await request(BASE_URL)
        .post("/management/assign-roles")
        .set("Authorization", `Bearer ${bearerToken}`)
        .send({
          roleToAssignId: clientRole!.id,
          userToAssignId: client1!.id,
        });
      expect(staff1!.isVerified).toBe(false);
      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Please verify your email");
      expect(staff2!.role.name).toBe("STAFF");

      // should work if staff is verified
      bearerToken = await mockLogin("staff2@gmail.com");
      response = await request(BASE_URL)
        .post("/management/assign-roles")
        .set("Authorization", `Bearer ${bearerToken}`)
        .send({
          roleToAssignId: clientRole!.id,
          userToAssignId: client1!.id,
        });
      expect(staff2!.isVerified).toBe(true);
      await updateUsers();
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Role assigned successfully.");
      expect(client1!.role.name).toBe("CLIENT");
    },
    BASE_TIMEOUT
  );

  it("Add company fails if not called by ADMIN / STAFF", async () => {
    const bearerToken = await mockLogin("client2@gmail.com");
    const response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "testCompany",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x1",
        rewardVault: "0x1",
      });
    expect(response.status).toBe(403);
    expect(response.body.message).toBe(
      "You don't have permission to perform this action."
    );
  });

  it("Add company should fail if wrong data format is passed", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");

    let response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x1",
        rewardVault: "0x1",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Name, location, website, and walletAddress are required."
    );

    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "testCompany",
        website: "www.testCompany.com",
        walletAddress: "0x1",
        rewardVault: "0x1",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Name, location, website, and walletAddress are required."
    );

    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "testCompany",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x2",
        rewardVault: "0x1",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid Ethereum wallet address.");

    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "testCompany",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
        rewardVault: "0x1",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid Ethereum wallet address.");

    //empty name
    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).not.toBe("Name cannot be empty.");
  });
  it("Add company should fail if same name exists", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    let response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "GlobalStake",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
      });
    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Company already exists.");
    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "Globalstake",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
      });
    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Company already exists.");

    response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "globalSTaKe",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
      });
    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Company already exists.");
  });
  it("Add company updates data correctly", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    let response = await request(BASE_URL)
      .post("/management/add-company")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        name: "testCompany",
        location: "Singapore",
        website: "www.testCompany.com",
        walletAddress: "0x4bdB8234AD81F26985d257F36a2d2d8c30365546",
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Company added successfully.");

    const companyRepository = getRepository(Company);
    const newCompany = await companyRepository.findOne({
      name: "testCompany",
    });
    expect(newCompany!.name).toBe("testCompany");
    expect(newCompany!.location).toBe("Singapore");
    expect(newCompany!.website).toBe("www.testCompany.com");
    expect(newCompany!.walletAddress).toBe(
      "0x4bdB8234AD81F26985d257F36a2d2d8c30365546"
    );
  });

  it("should fail to delete global stake company", async () => {
    const bearerToken = await mockLogin("admin@gmail.com");
    const response = await request(BASE_URL)
      .delete(`/management/remove-company/${globalStakeCompany!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Default company cannot be removed.");
  });

  it("should edit any company", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    let response = await request(BASE_URL)
      .put(`/management/edit-company/${newCompany!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        location: "Malaysia",
        rewardVault: "0xde3089d40f3491de794fbb1eca109fac36f889d0",
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Company edited successfully.");

    await updateCompanies();
    expect(newCompany!.location).toBe("Malaysia");
    expect(newCompany!.rewardVault).toBe(
      "0xde3089d40f3491de794fbb1eca109fac36f889d0"
    );

    // should fail if wrong data format is passed
    response = await request(BASE_URL)
      .put(`/management/edit-company/${newCompany!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        location: "Singapore",
        rewardVault: "0x2",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid Ethereum wallet address.");

    // send it back to normal
    response = await request(BASE_URL)
      .put(`/management/edit-company/${newCompany!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        location: "Singapore",
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Company edited successfully.");

    await updateCompanies();
    expect(newCompany!.location).toBe("Singapore");
  });

  it("should succesfully delete a company", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");

    // assign role to client3
    let response = await request(BASE_URL)
      .post("/management/assign-roles")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        roleToAssignId: clientRole!.id,
        userToAssignId: client3!.id,
      });

    expect(response.statusCode).toBe(200);

    // get testcompany id
    const tmpCompany = await getRepository(Company).findOne({
      name: "testCompany",
    });
    // assign  company to client1
    response = await request(BASE_URL)
      .post("/management/assignCompany")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: tmpCompany!.id,
        userToAssignId: client3!.id,
      });

    await updateUsers();
    expect(client3!.company!.name).toBe("testCompany");
    expect(response.statusCode).toBe(200);

    // delete company
    response = await request(BASE_URL)
      .delete(`/management/remove-company/${tmpCompany!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Company removed successfully.");

    await updateUsers();
    const companies = await getRepository(Company).find({});
    expect(companies.length).toBe(3);
    expect(client3!.company).toBe(null);
  });

  it("should update reward vault successfully", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    const response = await request(BASE_URL)
      .post("/management/reward-vault")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        companyId: newCompany!.id,
        rewardVault: "0x2222",
      });
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Reward vault updated successfully.");
    await updateCompanies();
    expect(newCompany!.rewardVault).toBe("0x2222");
  });

  it("should fail to create private link if client with wallet address not found", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    // add 2 private links
    let response = await request(BASE_URL)
      .post("/management/generate-link")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        validators: "RandomData1",
        client: "RandomClient1",
      });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Company with the provided wallet address not found."
    );
  });

  it("should successfully add private links", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    // add 2 private links
    let response = await request(BASE_URL)
      .post("/management/generate-link")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        validators: JSON.stringify(sampleValidatorTxData),
        client: "0x2",
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Link generated successfully.");
    linkToken1 = response.body.linkToken;

    response = await request(BASE_URL)
      .post("/management/generate-link")
      .set("Authorization", `Bearer ${bearerToken}`)
      .send({
        validators: JSON.stringify(sampleValidatorTxData2),
        client: "0x2",
      });
    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Link generated successfully.");
    linkToken2 = response.body.linkToken;

    // get all links
    response = await request(BASE_URL)
      .get("/infos/getLink")
      .set("Authorization", `Bearer ${linkToken1}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Link data retrieved successfully");
    expect(response.body.linkData.fundValidatorTxData.depositDataRoot).toBe(
      sampleValidatorTxData.depositDataRoot
    );
    linkData1 = response.body.linkData;

    response = await request(BASE_URL)
      .get("/infos/getLink")
      .set("Authorization", `Bearer ${linkToken2}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Link data retrieved successfully");
    expect(response.body.linkData.fundValidatorTxData.depositDataRoot).toBe(
      sampleValidatorTxData2.depositDataRoot
    );
    linkData2 = response.body.linkData;
  });
  it("should fail to remove private link if not client role", async () => {
    const bearerToken = await mockLogin("staff2@gmail.com");
    // REMOVE PRIVATE LINK
    let response = await request(BASE_URL)
      .delete(`/management/delete-privateLink/${linkData1.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(403);
    expect(JSON.parse(response.text).message).toBe("Permission denied.");
  });

  it("should successfully delete private link if client", async () => {
    const bearerToken = await mockLogin("client2@gmail.com");
    // REMOVE PRIVATE LINK
    let response = await request(BASE_URL)
      .delete(`/management/delete-privateLink/${linkData1.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(200);
    expect(JSON.parse(response.text).message).toBe(
      "PrivateLink deleted successfully."
    );

    response = await request(BASE_URL)
      .delete(`/management/delete-privateLink/${linkData2.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(200);
    expect(JSON.parse(response.text).message).toBe(
      "PrivateLink deleted successfully."
    );

    // get all links
    const privateLinkRepository = getRepository(PrivateLink);
    const privateLinks = await privateLinkRepository.find({});
    expect(privateLinks.length).toBe(0);
  });

  it("should fail remove user if incorrect ROLE to ROLE", async () => {
    let bearerToken = await mockLogin("staff2@gmail.com");
    const admin = await getRepository(User).findOne({
      email: "admin@gmail.com",
    });
    // fail to remove admin
    let response = await request(BASE_URL)
      .delete(`/management/remove-user/${admin!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(403);

    response = await request(BASE_URL)
      .delete(`/management/remove-user/${staff2!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(403);

    bearerToken = await mockLogin("admin@gmail.com");
    response = await request(BASE_URL)
      .delete(`/management/remove-user/${admin!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);
    expect(response.status).toBe(403);
  });

  it("should successfully delete user if correct ROLE to ROLE", async () => {
    let bearerToken = await mockLogin("admin@gmail.com");
    let response = await request(BASE_URL)
      .delete(`/management/remove-user/${staff1!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("User removed successfully.");

    let deletedUser = await getRepository(User).findOne({
      email: "staff1@gmail.com",
    });
    expect(deletedUser).toBe(undefined);

    // staff delete client1
    bearerToken = await mockLogin("staff2@gmail.com");
    response = await request(BASE_URL)
      .delete(`/management/remove-user/${client1!.id}`)
      .set("Authorization", `Bearer ${bearerToken}`);

    deletedUser = await getRepository(User).findOne({
      email: "client1@gmail.com",
    });
    expect(deletedUser).toBe(undefined);

    // TODO check company updates
    // await updateCompanies();
    // expect(newCompany!.members.length).toBe(0);
  });
});
