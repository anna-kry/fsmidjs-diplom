import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestService } from './support-request.service';

describe('SupportRequestService subscribe', () => {
  it('delivers events and unsubscribes', () => {
    const emitter = new EventEmitter2();
    const service = new SupportRequestService(
      {} as Repository<SupportRequest>,
      {} as Repository<Message>,
      emitter,
    );
    const received: Message[] = [];
    const unsubscribe = service.subscribe((_request, message) => received.push(message));
    emitter.emit('support.message', { id: 1 } as SupportRequest, { id: 2 } as Message);
    expect(received.length).toBe(1);
    unsubscribe();
    emitter.emit('support.message', { id: 1 } as SupportRequest, { id: 3 } as Message);
    expect(received.length).toBe(1);
  });

  it('supports multiple subscribers independently', () => {
    const emitter = new EventEmitter2();
    const service = new SupportRequestService(
      {} as Repository<SupportRequest>,
      {} as Repository<Message>,
      emitter,
    );
    const a: Message[] = [];
    const b: Message[] = [];
    const unsubA = service.subscribe((_request, message) => a.push(message));
    const unsubB = service.subscribe((_request, message) => b.push(message));
    emitter.emit('support.message', {} as SupportRequest, { id: 1 } as Message);
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    unsubA();
    emitter.emit('support.message', {} as SupportRequest, { id: 2 } as Message);
    expect(a.length).toBe(1);
    expect(b.length).toBe(2);
    unsubB();
  });
});
