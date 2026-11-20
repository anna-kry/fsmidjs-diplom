import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';
import { User } from '../../users/entities/user.entity';
import { SupportRequest } from './support-request.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: ID;

  @ManyToOne(() => SupportRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportRequestId' })
  supportRequest: SupportRequest;

  @Column()
  supportRequestId: ID;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: ID;

  @Column({ type: 'text' })
  text: string;

  @CreateDateColumn()
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;
}
