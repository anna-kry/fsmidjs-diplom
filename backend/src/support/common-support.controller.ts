import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import type { User } from '../users/entities/user.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { MarkMessagesAsReadDto } from './dto/mark-read.dto';
import { SupportRequestClientService } from './support-request-client.service';
import { SupportRequestEmployeeService } from './support-request-employee.service';
import { SupportRequestService } from './support-request.service';

@Controller('common/support-requests')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('client', 'manager')
export class CommonSupportController {
  constructor(
    private readonly supportService: SupportRequestService,
    private readonly clientService: SupportRequestClientService,
    private readonly employeeService: SupportRequestEmployeeService,
  ) {}

  @Get(':id/messages')
  async getMessages(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: ID) {
    const messages = await this.supportService.getMessages(id, user.id, user.role === 'manager');
    return messages.map((m) => ({
      id: m.id,
      createdAt: m.sentAt,
      text: m.text,
      readAt: m.readAt,
      author: { id: m.author.id, name: m.author.name },
    }));
  }

  @Post(':id/messages')
  async sendMessage(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: ID, @Body() dto: SendMessageDto) {
    const isEmployee = user.role === 'manager';
    const message = await this.supportService.sendMessage({
      author: user.id,
      supportRequest: id,
      text: dto.text,
      isEmployee,
    });
    return {
      id: message.id,
      createdAt: message.sentAt,
      text: message.text,
      readAt: message.readAt,
      author: { id: user.id, name: user.name },
    };
  }

  @Post(':id/messages/read')
  async markRead(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: ID, @Body() dto: MarkMessagesAsReadDto) {
    if (user.role === 'client') {
      await this.clientService.markMessagesAsRead({
        user: user.id,
        supportRequest: id,
        createdBefore: new Date(dto.createdBefore),
      });
    } else {
      await this.employeeService.markMessagesAsRead({
        user: user.id,
        supportRequest: id,
        createdBefore: new Date(dto.createdBefore),
      });
    }
    return { success: true };
  }
}
