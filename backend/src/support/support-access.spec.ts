import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestService } from './support-request.service';
import { SupportRequestClientService } from './support-request-client.service';

describe('Support access', () => {
  it('client gets foreign request -> 403', async () => {
    const emitter = new EventEmitter2();
    const requestRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 2, isActive: true }) } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestService(requestRepo, messageRepo, emitter);
    await expect(service.getMessages(1, 1, false)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('client sends message to foreign request -> 403', async () => {
    const emitter = new EventEmitter2();
    const requestRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 2, isActive: true }) } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestService(requestRepo, messageRepo, emitter);
    await expect(service.sendMessage({ author: 1, supportRequest: 1, text: 'hi', isEmployee: false })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('send message to closed request -> 400', async () => {
    const emitter = new EventEmitter2();
    const requestRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1, isActive: false }) } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestService(requestRepo, messageRepo, emitter);
    await expect(service.sendMessage({ author: 1, supportRequest: 1, text: 'hi', isEmployee: false })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mark read foreign request -> 403', async () => {
    const requestRepo = { findOne: jest.fn().mockResolvedValue({ id: 1, userId: 2 }) } as unknown as Repository<SupportRequest>;
    const messageRepo = { createQueryBuilder: jest.fn() } as unknown as Repository<Message>;
    const service = new SupportRequestClientService(requestRepo, messageRepo, {} as unknown as SupportRequestService, new EventEmitter2());
    await expect(service.markMessagesAsRead({ user: 1, supportRequest: 1, createdBefore: new Date() })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('nonexistent request -> 404', async () => {
    const emitter = new EventEmitter2();
    const requestRepo = { findOne: jest.fn().mockResolvedValue(null) } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestService(requestRepo, messageRepo, emitter);
    await expect(service.getMessages(999, 1, false)).rejects.toBeInstanceOf(NotFoundException);
  });
});
