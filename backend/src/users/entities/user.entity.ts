import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';

export type UserRole = 'client' | 'admin' | 'manager';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: ID;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactPhone: string;

  @Column({
    type: 'enum',
    enum: ['client', 'admin', 'manager'],
    default: 'client',
  })
  role: UserRole;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
