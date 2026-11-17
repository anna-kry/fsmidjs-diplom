import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedGuard } from '../common/guards/authenticated.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ID } from '../common/types/id.type';
import { toBookResponse } from './book.mapper';
import { BooksService } from './books.service';
import { COVER_FIELD_NAME, CoverFile } from './cover-upload.config';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';

/**
 * Управление книгами: только admin (спецификация, раздел 6.7).
 * Создание и обновление — multipart/form-data с необязательной обложкой.
 */
@Controller('admin/books')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('admin')
export class AdminBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @UseInterceptors(FileInterceptor(COVER_FIELD_NAME))
  async create(
    @Body() dto: CreateBookDto,
    @UploadedFile() file?: CoverFile,
  ) {
    const book = await this.booksService.create(dto, file);
    return toBookResponse(book);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor(COVER_FIELD_NAME))
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() dto: UpdateBookDto,
    @UploadedFile() file?: CoverFile,
  ) {
    const book = await this.booksService.update(id, dto, file);
    return toBookResponse(book);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: ID) {
    await this.booksService.delete(id);
    return { success: true };
  }
}
