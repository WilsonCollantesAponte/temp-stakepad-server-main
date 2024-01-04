import request from "supertest";
import { getRepository, getConnection } from "typeorm";
import { seedAll } from "../seeds/seedStakePad";
import { User } from "../models/User";
import { Role } from "../models/Role";
import {
  removeAllCollectionsData,
  BASE_TIMEOUT,
  BASE_URL,
  GOOD_PASSWORD,
  WEAK_PASSWORD,
} from "../utils/test";

describe("/auth/signup", () => {
  beforeEach(async () => {
    await removeAllCollectionsData();
    await seedAll();
  }, BASE_TIMEOUT);
  afterEach(async () => {
    await getConnection().close();
  });
  it(
    "updates list of users upon signup",
    async () => {
      await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
        repeatPassword: GOOD_PASSWORD,
        name: "Staff",
      });
      const userRepository = getRepository(User);
      const users = await userRepository.find();
      expect(users.length).toBe(2);
      expect(users[1].email).toBe("staff@gmail.com");
      expect(users[1].name).toBe("Staff");
      expect(users[1].isVerified).toBe(false);
    },
    BASE_TIMEOUT
  );
  it(
    "should fail when repeat password is not same",
    async () => {
      const response = await request(BASE_URL)
        .post("/auth/signup")
        .send({
          email: "staff@gmail.com",
          password: GOOD_PASSWORD,
          repeatPassword: GOOD_PASSWORD + "u",
          name: "Staff",
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Passwords do not match.");
    },
    BASE_TIMEOUT
  );

  it(
    "should fail when email is already registered and verified",
    async () => {
      const userRepository = getRepository(User);

      const user = new User();

      user.email = "staff@gmail.com";
      user.password = GOOD_PASSWORD;
      user.name = "Staff";
      user.profilePicturePath = "";
      user.isVerified = true;

      await userRepository.save(user);

      const response = await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
        repeatPassword: GOOD_PASSWORD,
        name: "Staff",
      });

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Email already registered and verified."
      );
    },
    BASE_TIMEOUT
  );

  it(
    "should fail when email is trying to register with different case and already verified",
    async () => {
      const userRepository = getRepository(User);

      const user = new User();

      user.email = "STAFF@GMAIL.COM";
      user.password = GOOD_PASSWORD;
      user.name = "Staff";
      user.profilePicturePath = "";
      user.isVerified = true;

      await userRepository.save(user);

      const response = await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
        repeatPassword: GOOD_PASSWORD,
        name: "Staff",
      });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Email already registered and verified."
      );
    },
    BASE_TIMEOUT
  );

  it(
    "should fail sign up with an empty password",
    async () => {
      const response = await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: "",
        repeatPassword: "",
        name: "Staff",
      });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character."
      );
    },
    BASE_TIMEOUT
  );
  it(
    "should fail with a weak password",
    async () => {
      const response = await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: WEAK_PASSWORD,
        repeatPassword: WEAK_PASSWORD,
        name: "Staff",
      });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe(
        "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character."
      );
    },
    BASE_TIMEOUT
  );
  it(
    "should fail to verify twice",
    async () => {
      await request(BASE_URL).post("/auth/signup").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
        repeatPassword: GOOD_PASSWORD,
        name: "Staff",
      });
      const user = await getRepository(User).findOne({
        email: "staff@gmail.com",
      });
      expect(user?.isVerified).toBe(false);
      const emailVerificationToken = user?.emailVerificationToken;
      let response = await request(BASE_URL)
        .get("/auth/verify-email")
        .query({ token: emailVerificationToken });
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Email verified successfully.");

      response = await request(BASE_URL).get("/auth/verify-email");
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Token is required.");

      response = await request(BASE_URL)
        .get("/auth/verify-email")
        .query({ token: emailVerificationToken });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Invalid or expired token.");
    },
    BASE_TIMEOUT
  );
});

describe("/auth/login", () => {
  beforeEach(async () => {
    await removeAllCollectionsData();
    await seedAll();
    // register 2 users
    await request(BASE_URL).post("/auth/signup").send({
      email: "staFf@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "Staff",
    });
    await request(BASE_URL).post("/auth/signup").send({
      email: "Client@gmail.com",
      password: GOOD_PASSWORD,
      repeatPassword: GOOD_PASSWORD,
      name: "Staff",
    });

    // verify 1 user
    const userRepository = getRepository(User);
    const user = await userRepository.findOne({ email: "staFf@gmail.com" });
    user!.isVerified = true;
    await userRepository.save(user!);
  }, BASE_TIMEOUT);
  afterEach(async () => {
    await getConnection().close();
  });
  it(
    "should correctly login and get correct role",
    async () => {
      const loginData = await request(BASE_URL).post("/auth/login").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
      });
      expect(loginData.statusCode).toBe(200);
      expect(loginData.body.role).toBeUndefined();

      // change the role of this user
      const userRepository = getRepository(User);
      const roleRepository = getRepository(Role);
      const user = await userRepository.findOne({ email: "staff@gmail.com" });
      user!.role = (await roleRepository.findOne({ name: "STAFF" }))!;
      await userRepository.save(user!);

      const loginData2 = await request(BASE_URL).post("/auth/login").send({
        email: "staff@gmail.com",
        password: GOOD_PASSWORD,
      });
      expect(loginData2.statusCode).toBe(200);
      expect(loginData2.body.role).toBe("STAFF");
    },
    BASE_TIMEOUT
  );
  it(
    "should fail to login with wrong password",
    async () => {
      const loginData = await request(BASE_URL)
        .post("/auth/login")
        .send({
          email: "staff@gmail.com",
          password: GOOD_PASSWORD + "u",
        });
      expect(loginData.statusCode).toBe(401);
      expect(loginData.body.message).toBe("Invalid email or password.");
    },
    BASE_TIMEOUT
  );
  it("should fail if email is not verified", async () => {
    const loginData = await request(BASE_URL).post("/auth/login").send({
      email: "client@gmail.com",
      password: GOOD_PASSWORD,
    });
    expect(loginData.statusCode).toBe(403);
  });
});

describe("/auth/reset-password", () => {
  beforeEach(async () => {
    await removeAllCollectionsData();
    await seedAll();
  });
  afterEach(async () => {
    await getConnection().close();
  });

  it(
    "should correctly update password",
    async () => {
      let response = await request(BASE_URL)
        .post("/auth/forgot-password")
        .send({
          email: "Admin@gmail.com",
        });
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Password reset email sent.");

      const user = await getRepository(User).findOne({
        email: "Admin@gmail.com",
      });
      const resetToken = user?.resetToken;
      expect(resetToken).toBeDefined();

      response = await request(BASE_URL)
        .post("/auth/reset-password")
        .send({
          token: resetToken,
          newPassword: GOOD_PASSWORD + "u",
          confirmNewPassword: GOOD_PASSWORD + "u",
        });
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe("Password reset successfully.");

      // login should work
      const loginData = await request(BASE_URL)
        .post("/auth/login")
        .send({
          email: "AdmIn@gmail.com",
          password: GOOD_PASSWORD + "u",
        });
      expect(loginData.statusCode).toBe(200);
      expect(loginData.body.role).toBe("ADMIN");
    },
    BASE_TIMEOUT
  );
  it("should fail to reset if email is wrong", async () => {
    let response = await request(BASE_URL).post("/auth/forgot-password").send({
      email: "staff@gmail.com",
    });
    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe(
      "No user found with that email address."
    );
  });
  it("should fail to reset if password is not safe", async () => {
    await request(BASE_URL).post("/auth/forgot-password").send({
      email: "admin@gmail.com",
    });
    const user = await getRepository(User).findOne({
      email: "admin@gmail.com",
    });
    const resetToken = user?.resetToken;
    const response = await request(BASE_URL).post("/auth/reset-password").send({
      token: resetToken,
      newPassword: WEAK_PASSWORD,
      confirmNewPassword: WEAK_PASSWORD,
    });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Password must contain at least 8 characters, 1 uppercase letter, 1 lowercase letter, 1 number and 1 special character."
    );
  });
  it(
    "should fail to login with old password",
    async () => {
      await request(BASE_URL).post("/auth/forgot-password").send({
        email: "Admin@gmail.com",
      });

      const user = await getRepository(User).findOne({
        email: "Admin@gmail.com",
      });
      const resetToken = user?.resetToken;

      await request(BASE_URL)
        .post("/auth/reset-password")
        .send({
          token: resetToken,
          newPassword: GOOD_PASSWORD + "u",
          confirmNewPassword: GOOD_PASSWORD + "u",
        });

      // login should not work
      const loginData = await request(BASE_URL).post("/auth/login").send({
        email: "AdmIn@gmail.com",
        password: GOOD_PASSWORD,
      });
      expect(loginData.statusCode).toBe(401);
      expect(loginData.body.message).toBe("Invalid email or password.");
    },
    BASE_TIMEOUT
  );

  it(
    "should fail to reset password twice with same token",
    async () => {
      await request(BASE_URL).post("/auth/forgot-password").send({
        email: "Admin@gmail.com",
      });

      const user = await getRepository(User).findOne({
        email: "Admin@gmail.com",
      });
      const resetToken = user?.resetToken;

      await request(BASE_URL)
        .post("/auth/reset-password")
        .send({
          token: resetToken,
          newPassword: GOOD_PASSWORD + "u",
          confirmNewPassword: GOOD_PASSWORD + "u",
        });
      const response = await request(BASE_URL)
        .post("/auth/reset-password")
        .send({
          token: resetToken,
          newPassword: GOOD_PASSWORD + "q",
          confirmNewPassword: GOOD_PASSWORD + "q",
        });
      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe("Invalid or expired token.");

      // should be able to login with previous pwd
      let loginData = await request(BASE_URL)
        .post("/auth/login")
        .send({
          email: "AdmIn@gmail.com",
          password: GOOD_PASSWORD + "u",
        });
      expect(loginData.statusCode).toBe(200);
      expect(loginData.body.message).toBe("Logged in successfully");

      // login should not work
      loginData = await request(BASE_URL)
        .post("/auth/login")
        .send({
          email: "AdmIn@gmail.com",
          password: GOOD_PASSWORD + "q",
        });
      expect(loginData.statusCode).toBe(401);
      expect(loginData.body.message).toBe("Invalid email or password.");
    },
    BASE_TIMEOUT
  );
});
