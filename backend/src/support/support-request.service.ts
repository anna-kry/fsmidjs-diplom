import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { ID } from '../common/types/id.type';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class SupportRequestService {
  constructor(
    @InjectRepository(SupportRequest)
    private readonly supportRequestRepository: Repository<SupportRequest>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findSupportRequests(params: {
    user: ID | null;
    isActive: boolean;
    recipient?: 'client' | 'employee';
  }): Promise<SupportRequest[]> {
    const where: { isActive: boolean; userId?: ID } = { isActive: params.isActive };
    if (params.user !== null) {
      where.userId = params.user;
    }
    const requests = await this.supportRequestRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    for (const request of requests) {
      request.hasNewMessages = await this.computeHasNewMessages(
        request.id,
        request.userId,
        params.recipient || 'client',
      );
    }
    return requests;
  }

  private async computeHasNewMessages(
    supportRequestId: ID,
    clientUserId: ID,
    recipient: 'client' | 'employee',
  ): Promise<boolean> {
    const qb = this.messageRepository.createQueryBuilder('m');
    qb.where('m.supportRequestId = :id', { id: supportRequestId }).andWhere('m.readAt IS NULL');
    if (recipient === 'client') {
      qb.andWhere('m.authorId != :userId', { userId: clientUserId });
    } else {
      qb.andWhere('m.authorId = :userId', { userId: clientUserId });
    }
    const count = await qb.getCount();
    return count > 0;
  }

  async getMessages(supportRequest: ID, currentUserId?: ID, isEmployee?: boolean): Promise<Message[]> {
    const request = await this.supportRequestRepository.findOne({ where: { id: supportRequest } });
    if (!request) throw new NotFoundException('Обращение не найдено');
    if (!isEmployee && currentUserId && request.userId !== currentUserId) {
      throw new ForbiddenException('Нет доступа к обращению');
    }
    return this.messageRepository.find({
      where: { supportRequestId: supportRequest },
      relations: ['author'],
      order: { sentAt: 'ASC' },
    });
  }

  /**
   * Возвращает обращение после проверки существования и доступа.
   * Клиент — только своё обращение; менеджер — любое.
   */
  async getRequestWithAccess(
    supportRequest: ID,
    currentUserId: ID,
    isEmployee: boolean,
  ): Promise<SupportRequest> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: supportRequest },
    });
    if (!request) throw new NotFoundException('Обращение не найдено');
    if (!isEmployee && request.userId !== currentUserId) {
      throw new ForbiddenException('Нет доступа к обращению');
    }
    return request;
  }

  async sendMessage(data: {
    author: ID;
    supportRequest: ID;
    text: string;
    isEmployee?: boolean;
  }): Promise<Message> {
    const request = await this.supportRequestRepository.findOne({
      where: { id: data.supportRequest },
    });
    if (!request) throw new NotFoundException('Обращение не найдено');
    if (!request.isActive) throw new BadRequestException('Обращение закрыто');
    if (!data.isEmployee && request.userId !== data.author) {
      throw new ForbiddenException('Нет доступа к обращению');
    }
    const message = this.messageRepository.create({
      supportRequestId: data.supportRequest,
      authorId: data.author,
      text: data.text,
    });
    const saved = await this.messageRepository.save(message);
    this.eventEmitter.emit('support.message', request, saved);
    return saved;
  }

  subscribe(
    handler: (supportRequest: SupportRequest, message: Message) => void,
  ): () => void {
    this.eventEmitter.on('support.message', handler);
    return () => {
      this.eventEmitter.off('support.message', handler);
    };
  }

  subscribeMessagesRead(
    handler: (data: {
      supportRequestId: ID;
      readerId: ID;
      createdBefore: Date;
    }) => void,
  ): () => void {
    this.eventEmitter.on('support.messagesRead', handler);
    return () => {
      this.eventEmitter.off('support.messagesRead', handler);
    };
  }
}
