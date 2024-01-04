import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { User } from "./User"; // Importing the User model
import { Company } from "./Company"; // Importing the Company model

@Entity()
export class PrivateLink {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Company) // Reference to User as the client
  client!: Company; // Using a User entity to represent a client

  @Column({ default: "0" })
  receiverAddress?: string;

  @Column()
  used!: boolean;

  @Column("json")
  fundValidatorTxData!: {
    pubkey: string;
    withdrawalcredentials: string;
    signature: string;
    depositDataRoot: string;
  }[];
}
