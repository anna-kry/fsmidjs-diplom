import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';

/** Библиотека (спецификация, раздел 4). */
@Entity('libraries')
export class Library {
  @PrimaryGeneratedColumn()
  id: ID;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 300 })
  address: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
