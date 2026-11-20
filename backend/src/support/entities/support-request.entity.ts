import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

@Entity('support_requests')
export class SupportRequest {
  @PrimaryGeneratedColumn()
  id: ID;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: ID;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Message, (message) => message.supportRequest)
  messages: Message[];

  hasNewMessages?: boolean;
}
