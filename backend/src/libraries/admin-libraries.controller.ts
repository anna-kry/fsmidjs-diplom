import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import { CreateLibraryDto, UpdateLibraryDto } from './dto/library.dto';
import { LibrariesService } from './libraries.service';

/** Управление библиотеками: только admin (спецификация, раздел 6.7). */
@Controller('admin/libraries')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminLibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Post()
  create(@Body() dto: CreateLibraryDto) {
    return this.librariesService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: ID, @Body() dto: UpdateLibraryDto) {
    return this.librariesService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: ID) {
    await this.librariesService.delete(id);
    return { success: true };
  }
}
