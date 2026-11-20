import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID } from '../common/types/id.type';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class SupportRequestEmployeeService {
  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRequestRepository: Repository<SupportRequest>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async markMessagesAsRead(params: {
    user: ID;
    supportRequest: ID;
    createdBefore: Date;
  }): Promise<void> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: params.supportRequest },
    });
    if (!request) throw new NotFoundException('Обращение не найдено');
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('supportRequestId = :supportRequest', { supportRequest: params.supportRequest })
      .andWhere('authorId = :client', { client: request.userId })
      .andWhere('readAt IS NULL')
      .andWhere('sentAt <= :createdBefore', { createdBefore: params.createdBefore })
      .execute();
  }

  async getUnreadCount(supportRequest: ID): Promise<number> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: supportRequest },
    });
    if (!request) return 0;
    return this.messageRepository
      .createQueryBuilder('m')
      .where('m.supportRequestId = :id', { id: supportRequest })
      .andWhere('m.readAt IS NULL')
      .andWhere('m.authorId = :userId', { userId: request.userId })
      .getCount();
  }

  async closeRequest(supportRequest: ID): Promise<void> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: supportRequest },
    });
    if (!request) throw new NotFoundException('Обращение не найдено');
    await this.supportRequestRepository.update(supportRequest, { isActive: false });
  }
}
