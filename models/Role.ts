// src/models/Role.ts

import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { User } from "./User";

@Entity()
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string; // 'ADMIN', 'STAFF', 'CLIENT'

  @Column({ default: 0 })
  count!: number; // Number of users with this role

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
