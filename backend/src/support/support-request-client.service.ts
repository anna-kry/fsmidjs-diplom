import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID } from '../common/types/id.type';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestService } from './support-request.service';

@Injectable()
export class SupportRequestClientService {
  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRequestRepository: Repository<SupportRequest>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly supportRequestService: SupportRequestService,
  ) {}

  async createSupportRequest(data: { user: ID; text: string }): Promise<SupportRequest> {
    const request = this.supportRequestRepository.create({
      userId: data.user,
      isActive: true,
    });
    const savedRequest = await this.supportRequestRepository.save(request);
    await this.supportRequestService.sendMessage({
      author: data.user,
      supportRequest: savedRequest.id,
      text: data.text,
    });
    return savedRequest;
  }

  async markMessagesAsRead(params: {
    user: ID;
    supportRequest: ID;
    createdBefore: Date;
  }): Promise<void> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: params.supportRequest },
    });
    if (!request) throw new NotFoundException('Обращение не найдено');
    if (request.userId !== params.user) throw new ForbiddenException('Нет доступа к обращению');
    await this.messageRepository
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('supportRequestId = :supportRequest', { supportRequest: params.supportRequest })
      .andWhere('authorId != :user', { user: params.user })
      .andWhere('readAt IS NULL')
      .andWhere('sentAt <= :createdBefore', { createdBefore: params.createdBefore })
      .execute();
  }

  async getUnreadCount(supportRequest: ID): Promise<number> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: supportRequest },
    });
    if (!request) return 0;
    // unread from non-client (employee) side: exclude client's own messages
    return this.messageRepository
      .createQueryBuilder('m')
      .where('m.supportRequestId = :id', { id: supportRequest })
      .andWhere('m.readAt IS NULL')
      .andWhere('m.authorId != :userId', { userId: request.userId })
      .getCount();
  }
}
