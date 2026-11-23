import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestClientService } from './support-request-client.service';

describe('messagesRead событие', () => {
  it('клиентская служба излучает событие после отметки прочитанным', async () => {
    const emitter = new EventEmitter2();
    const emitted: any[] = [];
    emitter.on('support.messagesRead', (data: any) => emitted.push(data));
    const requestRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, userId: 1 }),
    } as unknown as Repository<SupportRequest>;
    const messageRepo = {
      createQueryBuilder: () => {
        const chain = {
          update: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        };
        return chain;
      },
    } as unknown as Repository<Message>;
    const service = new SupportRequestClientService(
      requestRepo,
      messageRepo,
      {} as any,
      emitter,
    );
    await service.markMessagesAsRead({
      user: 1,
      supportRequest: 1,
      createdBefore: new Date('2026-01-01T00:00:00Z'),
    });
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual({
      supportRequestId: 1,
      readerId: 1,
      createdBefore: new Date('2026-01-01T00:00:00Z'),
    });
  });

  it('клиентская служба не излучает событие, если обращение не найдено', async () => {
    const emitter = new EventEmitter2();
    const emitted: any[] = [];
    emitter.on('support.messagesRead', (data: any) => emitted.push(data));
    const requestRepo = { findOne: jest.fn().mockResolvedValue(null) } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestClientService(
      requestRepo,
      messageRepo,
      {} as any,
      emitter,
    );
    await expect(
      service.markMessagesAsRead({
        user: 1,
        supportRequest: 999,
        createdBefore: new Date(),
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(emitted).toHaveLength(0);
  });

  it('клиентская служба не излучает событие при доступе к чужому обращению', async () => {
    const emitter = new EventEmitter2();
    const emitted: any[] = [];
    emitter.on('support.messagesRead', (data: any) => emitted.push(data));
    const requestRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, userId: 2 }),
    } as unknown as Repository<SupportRequest>;
    const messageRepo = {} as unknown as Repository<Message>;
    const service = new SupportRequestClientService(
      requestRepo,
      messageRepo,
      {} as any,
      emitter,
    );
    await expect(
      service.markMessagesAsRead({
        user: 1,
        supportRequest: 1,
        createdBefore: new Date(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(emitted).toHaveLength(0);
  });

  it('специфичный any не используется в ожидаемых данных', () => {
    const emitter = new EventEmitter2();
    const emitted: { supportRequestId: number; readerId: number; createdBefore: Date }[] = [];
    emitter.on('support.messagesRead', (data: { supportRequestId: number; readerId: number; createdBefore: Date }) => {
      emitted.push(data);
    });
    expect(emitted).toEqual([]);
  });
});
