import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./User";
import { PrivateLink } from "./PrivateLink";

@Entity()
export class Company {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  location!: string;

  @Column()
  website!: string;

  @Column()
  walletAddress!: string;

  @Column({ type: "varchar", nullable: true })
  slack?: string;

  @Column({ type: "varchar", nullable: true })
  rewardVault?: string; // EVM address

  @OneToMany(() => User, (user) => user.company)
  members!: User[];

  @OneToMany(() => PrivateLink, (privateLink) => privateLink.client)
  privateLinks!: PrivateLink[];
}
