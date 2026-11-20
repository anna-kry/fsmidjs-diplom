import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SupportRequest } from './entities/support-request.entity';
import { Message } from './entities/message.entity';
import { SupportRequestService } from './support-request.service';
import { SupportRequestClientService } from './support-request-client.service';
import { SupportRequestEmployeeService } from './support-request-employee.service';
import { ClientSupportController } from './client-support.controller';
import { ManagerSupportController } from './manager-support.controller';
import { CommonSupportController } from './common-support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SupportRequest, Message]), EventEmitterModule.forRoot()],
  controllers: [ClientSupportController, ManagerSupportController, CommonSupportController],
  providers: [SupportRequestService, SupportRequestClientService, SupportRequestEmployeeService],
  exports: [SupportRequestService, SupportRequestClientService, SupportRequestEmployeeService],
})
export class SupportModule {}
