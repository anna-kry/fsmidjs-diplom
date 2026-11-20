import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ID } from '../common/types/id.type';
import { toBookResponse } from './book.mapper';
import { BooksService } from './books.service';
import { SearchBooksQueryDto } from './dto/search-books-query.dto';

/** Публичные маршруты книг: доступны без авторизации. */
@Controller('common/books')
export class CommonBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  async findAll(@Query() query: SearchBooksQueryDto) {
    const { books, total } = await this.booksService.findAll(query);
    // items — страница книг, total — общее число совпадений (для «Найдено: N»).
    return { items: books.map(toBookResponse), total };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: ID) {
    const book = await this.booksService.findById(id);
    return toBookResponse(book);
  }
}
