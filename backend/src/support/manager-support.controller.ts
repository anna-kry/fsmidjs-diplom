import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import { SupportRequestEmployeeService } from './support-request-employee.service';
import { SupportRequestService } from './support-request.service';

@Controller('manager/support-requests')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('manager')
export class ManagerSupportController {
  constructor(
    private readonly employeeService: SupportRequestEmployeeService,
    private readonly supportService: SupportRequestService,
  ) {}

  @Get()
  async findAll(@Query('isActive') isActive?: string) {
    const requests = await this.supportService.findSupportRequests({
      user: null,
      isActive: isActive === undefined ? true : isActive === 'true',
      recipient: 'employee',
    });
    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      isActive: r.isActive,
      hasNewMessages: r.hasNewMessages ?? false,
      client: r.user
        ? { id: r.user.id, name: r.user.name, email: r.user.email, contactPhone: r.user.contactPhone }
        : null,
    }));
  }

  @Post(':id/close')
  async close(@Param('id', ParseIntPipe) id: ID) {
    await this.employeeService.closeRequest(id);
    return { success: true };
  }
}
