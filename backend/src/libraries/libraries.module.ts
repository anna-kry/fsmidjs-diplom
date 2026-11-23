import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RentalsModule } from '../rentals/rentals.module';
import { RentalsService } from '../rentals/rentals.service';
import { AdminBooksController } from './admin-books.controller';
import { AdminLibrariesController } from './admin-libraries.controller';
import { BooksService } from './books.service';
import { CommonBooksController } from './common-books.controller';
import { CommonLibrariesController } from './common-libraries.controller';
import { Book } from './entities/book.entity';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { ACTIVE_RENTALS_CHECKER } from './interfaces/active-rentals-checker.interface';
import { LibrariesService } from './libraries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Library, Book, LibraryBook]),
    RentalsModule,
  ],
  controllers: [
    CommonLibrariesController,
    CommonBooksController,
    AdminLibrariesController,
    AdminBooksController,
  ],
  providers: [
    LibrariesService,
    BooksService,
    // Реальная проверка активных аренд (День 4): RentalsService из
    // модуля аренды реализует ActiveRentalsChecker.
    { provide: ACTIVE_RENTALS_CHECKER, useExisting: RentalsService },
  ],
  exports: [LibrariesService, BooksService],
})
export class LibrariesModule {}
