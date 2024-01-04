import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { Role } from "./Role";
import { Company } from "./Company";
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column({ type: "boolean", default: false })
  isVerified!: boolean;

  @Column({ type: "text", nullable: true })
  emailVerificationToken?: string | null;

  // Password reset
  @Column({ type: "varchar", nullable: true })
  resetToken?: string | null;
  @Column({ type: "timestamp", nullable: true })
  resetTokenExpiry?: Date | null;
  @Column({ type: "varchar", nullable: true })
  loginLastIat?: number | null;

  @Column()
  password!: string; // This too should be encrypted before saving

  @Column()
  profilePicturePath!: string;

  @ManyToOne(() => Role, (role) => role.users)
  role!: Role;

  @ManyToOne(() => Company, (company) => company.members, { nullable: true }) // relation to Company
  company?: Company;
}
