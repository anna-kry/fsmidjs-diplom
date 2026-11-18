import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientRentalsController } from './client-rentals.controller';
import { BookRental } from './entities/book-rental.entity';
import { ManagerRentalsController } from './manager-rentals.controller';
import { RentalsService } from './rentals.service';

/**
 * Модуль аренды книг: бронирование для клиента и управление
 * статусами для менеджера (спецификация, раздел 6.4).
 *
 * Экспортирует RentalsService: он же реализует ActiveRentalsChecker
 * для проверки 409 при удалении книг и библиотек.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BookRental])],
  controllers: [ClientRentalsController, ManagerRentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
