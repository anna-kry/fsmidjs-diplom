import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { UsersModule } from '../users/users.module';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestService } from './support-request.service';
import { SupportRequestClientService } from './support-request-client.service';
import { SupportRequestEmployeeService } from './support-request-employee.service';
import { ClientSupportController } from './client-support.controller';
import { ManagerSupportController } from './manager-support.controller';
import { CommonSupportController } from './common-support.controller';
import { SupportGateway } from './support.gateway';
import { PresenceService } from './services/presence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportRequest, Message]),
    EventEmitterModule.forRoot(),
    // Нужен для имени автора в событии newMessage.
    UsersModule,
  ],
  controllers: [ClientSupportController, ManagerSupportController, CommonSupportController],
  providers: [
    SupportRequestService,
    SupportRequestClientService,
    SupportRequestEmployeeService,
    SupportGateway,
    PresenceService,
  ],
  exports: [SupportRequestService, SupportRequestClientService, SupportRequestEmployeeService],
})
export class SupportModule {}
