import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBooksController } from './admin-books.controller';
import { AdminLibrariesController } from './admin-libraries.controller';
import { BooksService } from './books.service';
import { CommonBooksController } from './common-books.controller';
import { CommonLibrariesController } from './common-libraries.controller';
import { Book } from './entities/book.entity';
import { Library } from './entities/library.entity';
import { ACTIVE_RENTALS_CHECKER } from './interfaces/active-rentals-checker.interface';
import { LibrariesService } from './libraries.service';
import { NoActiveRentalsChecker } from './no-active-rentals-checker';

@Module({
  imports: [TypeOrmModule.forFeature([Library, Book])],
  controllers: [
    CommonLibrariesController,
    CommonBooksController,
    AdminLibrariesController,
    AdminBooksController,
  ],
  providers: [
    LibrariesService,
    BooksService,
    // До Дня 4 проверка аренд — заглушка; затем заменится на RentalsService.
    { provide: ACTIVE_RENTALS_CHECKER, useClass: NoActiveRentalsChecker },
  ],
  exports: [LibrariesService, BooksService],
})
export class LibrariesModule {}
