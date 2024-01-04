import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { Company } from "../models/Company";
import { Role } from "../models/Role";
import { getRepository, Repository } from "typeorm";
import { isValidEthereumAddress } from "../utils/validation";
import {
  UpdateRewardVaultRequestBody,
  IEnv,
  IRequest,
  UserPayload,
} from "../types/types";
import dotenv from "dotenv";
dotenv.config();

export const addCompany = async (req: IRequest, res: Response) => {
  const companyRepository = getRepository(Company);
  const { name, location, website, walletAddress, slack, rewardVault } =
    req.body;

  // Adjusting the required fields check
  if (!name || !location || !website || !walletAddress) {
    return res.status(400).send({
      message: "Name, location, website, and walletAddress are required.",
    });
  }

  // Name cannot be empty
  if (!name.trim()) {
    return res.status(400).send({ message: "Name cannot be empty." });
  }

  // Validate the Ethereum addresses
  if (
    !isValidEthereumAddress(walletAddress) ||
    (rewardVault && !isValidEthereumAddress(rewardVault))
  ) {
    return res
      .status(400)
      .send({ message: "Invalid Ethereum wallet address." });
  }

  const existingCompany = await companyRepository.findOne({ where: { name } });

  if (existingCompany) {
    return res.status(409).send({ message: "Company already exists." });
  }

  const newCompany = new Company();
  newCompany.name = name;
  newCompany.location = location;
  newCompany.website = website;
  newCompany.walletAddress = walletAddress;
  newCompany.slack = slack || null;

  newCompany.rewardVault = rewardVault || "0x0";

  await companyRepository.save(newCompany);
  return res
    .status(201)
    .send({ message: "Company added successfully.", company: newCompany });
};

export const removeCompany = async (req: Request, res: Response) => {
  const companyId = parseInt(req.params.id, 10);
  const companyRepository = getRepository(Company);
  const userRepository = getRepository(User);

  // GlobalStake default company
  const globalStake = (process.env as IEnv).DEFAULT_COMPANY_NAME;
  if (!globalStake) {
    return res
      .status(400)
      .send({ message: "Global Stake company name is missing in env file." });
  }

  const company: Company | undefined = await companyRepository.findOne(
    companyId
  );

  if (!company) {
    return res.status(404).send({ message: "Company not found." });
  }

  if (company.name.trim().toLowerCase() === globalStake.trim().toLowerCase()) {
    return res
      .status(400)
      .send({ message: "Default company cannot be removed." });
  }

  await userRepository
    .createQueryBuilder()
    .update(User)
    .set({ company: () => "NULL" })
    .where("company = :company", { company: companyId })
    .execute();

  await companyRepository.delete(companyId);

  return res.status(200).send({ message: "Company removed successfully." });
};

export const updateRewardVault = async (
  req: Request<{}, {}, UpdateRewardVaultRequestBody>,
  res: Response
) => {
  const companyRepository: Repository<Company> = getRepository(Company);
  const { companyId, rewardVault } = req.body;
  const company = await companyRepository.findOne(companyId);

  if (!company) {
    return res.status(404).send({ message: "Company not found." });
  }
  // no checks on valid ethereum address to avoid mistakes format parsing on the frontend
  company.rewardVault = rewardVault;
  await companyRepository.save(company);

  return res.status(200).send({
    message: "Reward vault updated successfully.",
    updatedCompany: company,
  });
};

export const editCompany = async (req: IRequest, res: Response) => {
  const { id } = req.params;
  const { name, location, website, walletAddress, slack, rewardVault } =
    req.body;

  const companyRepository = getRepository(Company);

  // Find the company to edit
  const company = await companyRepository.findOne(id);

  if (!company) {
    return res.status(404).send({ message: "Company not found." });
  }

  // Validation logic (optional)
  if (
    (walletAddress && !isValidEthereumAddress(walletAddress)) ||
    (rewardVault && !isValidEthereumAddress(rewardVault))
  ) {
    return res
      .status(400)
      .send({ message: "Invalid Ethereum wallet address." });
  }

  // Update the company details
  if (name) company.name = name;
  if (location) company.location = location;
  if (website) company.website = website;
  if (walletAddress) company.walletAddress = walletAddress;
  if (slack) company.slack = slack;
  if (rewardVault) company.rewardVault = rewardVault;

  await companyRepository.save(company);

  return res
    .status(200)
    .send({ message: "Company edited successfully.", company });
};

export const getCompanyDetails = async (req: IRequest, res: Response) => {
  const globalStake = process.env.DEFAULT_COMPANY_NAME;

  const companyRepository = getRepository(Company);
  let companies = await companyRepository.find();

  const filteredCompanies = companies.filter((company) => {
    return (
      company.name.trim().toUpperCase() !== globalStake?.trim().toUpperCase()
    );
  });
  return res.json(filteredCompanies);
};

export const getCompanyNames = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const companyRepository = getRepository(Company);

  try {
    const companies = await companyRepository.find({ select: ["id", "name"] }); // Added "id" to the select array

    const companyNamesAndIds = companies.map((company) => ({
      id: company.id,
      name: company.name,
    }));

    res.status(200).json({
      companies: companyNamesAndIds,
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyInfo = async (req: IRequest, res: Response) => {
  const { id } = req.params;
  const companyRepository = getRepository(Company);
  const userRepository = getRepository(User);

  const currentUser: UserPayload = req.user!;

  const userWithRoles = await userRepository.findOne({
    where: { id: currentUser.id },
    relations: ["role", "company"],
  });

  if (!userWithRoles || !userWithRoles.role) {
    return res
      .status(403)
      .send({ message: "You do not have the privilege to view this company." });
  }

  // If the user is a CLIENT, then perform additional checks.
  if (userWithRoles.role.name === "CLIENT") {
    if (!userWithRoles.company || userWithRoles.company.id.toString() !== id) {
      return res
        .status(403)
        .send({ message: "You are not authorized to view this company." });
    }
  }

  // Allow ADMIN and STAFF to bypass the above check and see any company
  if (["ADMIN", "STAFF"].includes(userWithRoles.role.name)) {
    const company = await companyRepository.findOne(id);
    if (!company) {
      return res.status(404).send({ message: "Company not found." });
    }
    return res.status(200).send(company);
  }

  const company = await companyRepository.findOne(id);

  if (!company) {
    return res.status(404).send({ message: "Company not found." });
  }

  return res.status(200).send(company);
};

export const assignCompany = async (
  req: IRequest,
  res: Response,
  next: NextFunction
) => {
  const userRepository = getRepository(User);
  const companyRepository = getRepository(Company);
  const roleRepository = getRepository(Role);

  const userToAssignId = Number(req.body.userToAssignId);
  const companyId = req.body.companyId;

  const adminRole = await roleRepository.findOne({ where: { name: "ADMIN" } });
  const staffRole = await roleRepository.findOne({ where: { name: "STAFF" } });

  if (!adminRole || !staffRole) {
    return res.status(500).send({ message: "Roles not found." });
  }

  const requester = await userRepository.findOne({
    where: { id: req.user?.id },
    relations: ["role"],
  });
  const userToAssign = await userRepository.findOne({
    where: { id: userToAssignId },
    relations: ["role"],
  });

  if (!requester || !userToAssign) {
    return res.status(404).send({ message: "User not found." });
  }

  const companyToAssign = await companyRepository.findOne({ id: companyId });
  if (!companyToAssign) {
    return res.status(404).send({ message: "Company not found." });
  }

  // Ensure the user to assign has a role
  if (!userToAssign.role) {
    return res.status(404).send({ message: "User does not have a role." });
  }

  // Ensure the company of the ADMIN cannot be changed
  if (userToAssign.role.name === "ADMIN") {
    return res
      .status(403)
      .send({ message: "You cannot change the company of an ADMIN." });
  }

  // Check if requester is staff
  if (requester.role.name === "STAFF") {
    // Check if the user to assign is not staff or themselves
    if (
      userToAssign.role.name === "STAFF" ||
      userToAssign.id === requester.id
    ) {
      return res
        .status(403)
        .send({ message: "Staff can only change the company for Clients." });
    }
  }

  userToAssign.company = companyToAssign;

  await userRepository.save(userToAssign);
  return res.status(200).send({ message: "Company assigned successfully." });
};
