import { getRepository } from "typeorm";
import { Role } from "../models/Role";
import { User } from "../models/User";
import { PrivateLink } from "../models/PrivateLink";
import { Company } from "../models/Company"; // Import the Company model
import bcrypt from "bcrypt";

export const seedRoles = async () => {
  const roleRepository = getRepository(Role);
  const defaultRoles = ["ADMIN", "STAFF", "CLIENT"];
  const roleIndexStart = 0;
  for (const roleName of defaultRoles) {
    let existingRole = await roleRepository.findOne({ name: roleName });

    if (!existingRole) {
      let role = new Role();
      role.name = roleName;
      role.count = 0;
      await roleRepository.save(role);
    } else {
    }
  }
};

export const seedCompany = async () => {
  const companyRepository = getRepository(Company);
  const existingCompany = await companyRepository.findOne({
    name: "GlobalStake",
  });

  if (!existingCompany) {
    const company = new Company();
    company.name = process.env.DEFAULT_COMPANY_NAME!;
    company.location = process.env.DEFAULT_COMPANY_LOCATION!;
    company.website = process.env.DEFAULT_COMPANY_WEBSITE!;
    company.walletAddress = process.env.DEFAULT_COMPANY_WALLET_ADDRESS!;
    company.slack = "";

    // Set other properties for the company here
    await companyRepository.save(company);
  }
};

export const seedAdmin = async () => {
  const userRepository = getRepository(User);
  const roleRepository = getRepository(Role);
  const companyRepository = getRepository(Company);

  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminName = process.env.ADMIN_NAME!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  const profilePicturePath = process.env.PROFILE_PICTURE_PATH!;

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminRole = await roleRepository.findOne({ name: "ADMIN" });

  if (adminRole) {
    const adminCount = await userRepository.count({ role: adminRole });

    if (adminCount !== adminRole.count) {
      adminRole.count = adminCount;
      await roleRepository.save(adminRole);
    }
  }
  const globalStakeCompany = await companyRepository.findOne({
    name: "GlobalStake",
  });

  const adminCount = await userRepository.count({ role: adminRole });

  if (adminRole && globalStakeCompany) {
    if (adminCount === 0) {
      // Create new admin
      const user = new User();
      user.email = adminEmail;
      user.name = adminName;
      user.password = hashedPassword;
      user.isVerified = true;
      user.role = adminRole;
      user.company = globalStakeCompany;
      user.profilePicturePath = profilePicturePath;
      await userRepository.save(user);

      adminRole.count += 1;
      await roleRepository.save(adminRole);
    } else if (adminCount === 1) {
      // Update existing admin
      const existingAdmin = await userRepository.findOne({ role: adminRole });
      if (existingAdmin) {
        existingAdmin.email = adminEmail;
        existingAdmin.name = adminName;
        existingAdmin.password = hashedPassword;
        existingAdmin.isVerified = true;
        existingAdmin.company = globalStakeCompany;
        existingAdmin.profilePicturePath = profilePicturePath;
        await userRepository.save(existingAdmin);
      }
    }
  }
};

export const removeAllCollectionsData = async () => {
  await getRepository(PrivateLink).delete({});
  await getRepository(User).delete({});
  await getRepository(Role).delete({});
  await getRepository(Company).delete({});
};

// For seeding roles, company, and admin
export const seedAll = async () => {
  await seedRoles();
  await seedCompany();
  await seedAdmin();
};
