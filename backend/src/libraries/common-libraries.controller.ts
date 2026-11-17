import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { ID } from '../common/types/id.type';
import { LibrariesService } from './libraries.service';

/** Публичные маршруты библиотек: доступны без авторизации. */
@Controller('common/libraries')
export class CommonLibrariesController {
  constructor(private readonly librariesService: LibrariesService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.librariesService.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: ID) {
    return this.librariesService.findById(id);
  }
}
