import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { User } from '../users/entities/user.entity';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { SupportRequestClientService } from './support-request-client.service';
import { SupportRequestService } from './support-request.service';

@Controller('client/support-requests')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('client')
export class ClientSupportController {
  constructor(
    private readonly clientService: SupportRequestClientService,
    private readonly supportService: SupportRequestService,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateSupportRequestDto) {
    const request = await this.clientService.createSupportRequest({ user: user.id, text: dto.text });
    const list = await this.supportService.findSupportRequests({ user: user.id, isActive: true, recipient: 'client' });
    const created = list.find((r) => r.id === request.id) ?? request;
    return {
      id: created.id,
      createdAt: created.createdAt,
      isActive: created.isActive,
      hasNewMessages: created.hasNewMessages ?? false,
    };
  }

  @Get()
  async findAll(@CurrentUser() user: User, @Query('isActive') isActive?: string) {
    const requests = await this.supportService.findSupportRequests({
      user: user.id,
      isActive: isActive === undefined ? true : isActive === 'true',
      recipient: 'client',
    });
    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      isActive: r.isActive,
      hasNewMessages: r.hasNewMessages ?? false,
    }));
  }
}
