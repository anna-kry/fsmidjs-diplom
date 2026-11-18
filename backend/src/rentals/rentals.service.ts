import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ID } from '../common/types/id.type';
import { ActiveRentalsChecker } from '../libraries/interfaces/active-rentals-checker.interface';
import { Book } from '../libraries/entities/book.entity';
import { BookRental } from './entities/book-rental.entity';
import {
  FindRentalsParams,
  FindUserRentalsParams,
  CreateRentalData,
  IRentalService,
  RentalStatus,
} from './interfaces/rental-service.interface';

/** Максимальная длительность брони в днях (спецификация, раздел 2, п. 10). */
const MAX_RENTAL_DAYS = 30;

/** Аренды, участвующие в проверке пересечения периодов (раздел 2, п. 9). */
const OVERLAPPING_STATUSES: RentalStatus[] = ['reserved', 'active'];

/** Аренды, блокирующие удаление книги или библиотеки (раздел 2, п. 12). */
const ACTIVE_STATUSES: RentalStatus[] = ['reserved', 'active'];

/**
 * Допустимые переходы статусов (спецификация, раздел 2, п. 11).
 * Всё, чего нет в таблице, — 400.
 */
const STATUS_TRANSITIONS: Record<RentalStatus, RentalStatus[]> = {
  reserved: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/**
 * Изменение availableCopies при переходе (раздел 2, п. 9):
 * - в `active` бронь занимает физический экземпляр: −1;
 * - из `active` при `completed` или `cancelled` экземпляр возвращается: +1;
 * - `reserved → cancelled` счётчик не трогает (reserved не занимал экземпляр).
 */
const COUNTER_DELTAS: Record<string, number> = {
  'reserved>active': -1,
  'active>completed': 1,
  'active>cancelled': 1,
};

/** Проверяет, что строка YYYY-MM-DD — существующая календарная дата. */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Локальная дата «сегодня» в формате YYYY-MM-DD. */
function todayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Разница между датами в днях (парсинг без часовых поясов). */
function daysBetween(dateStart: string, dateEnd: string): number {
  const parse = (value: string): number => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(dateEnd) - parse(dateStart)) / 86_400_000);
}

/** Приводит availableCopies к допустимому диапазону 0..totalCopies. */
function clampCopies(value: number, totalCopies: number): number {
  return Math.min(Math.max(value, 0), totalCopies);
}

/**
 * Аренда книг (спецификация, разделы 2 пп. 9–12 и 6.4).
 *
 * Создание и смена статуса выполняются в одной транзакции с блокировкой
 * строки книги (`SELECT ... FOR UPDATE`, pessimistic_write): проверка
 * пересечения периодов и запись брони атомарны, параллельные запросы
 * сериализуются по блокировке и не могут забронировать один экземпляр дважды.
 *
 * Реализует и ActiveRentalsChecker: удаление книги/библиотеки блокируют
 * брони в статусах `reserved` и `active` (409).
 */
@Injectable()
export class RentalsService implements IRentalService, ActiveRentalsChecker {
  constructor(
    @InjectRepository(BookRental)
    private readonly rentalsRepository: Repository<BookRental>,
    private readonly dataSource: DataSource,
  ) {}

  async create(userId: ID, dto: CreateRentalData): Promise<BookRental> {
    return this.dataSource.transaction(async (manager) => {
      this.assertDatesValid(dto.dateStart, dto.dateEnd);

      // Блокируем строку книги: параллельные создания ждут её по одному.
      const book = await manager.findOne(Book, {
        where: { id: dto.bookId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!book) {
        throw new NotFoundException('Книга не найдена');
      }

      if (book.libraryId !== dto.libraryId) {
        throw new BadRequestException(
          'Книга не относится к указанной библиотеке',
        );
      }

      const overlapping = await manager.count(BookRental, {
        where: {
          bookId: book.id,
          status: In(OVERLAPPING_STATUSES),
          dateStart: LessThanOrEqual(dto.dateEnd),
          dateEnd: MoreThanOrEqual(dto.dateStart),
        },
      });

      if (overlapping >= book.totalCopies) {
        throw new ConflictException(
          'На выбранные даты нет свободных экземпляров книги',
        );
      }

      // Статус reserved не занимает экземпляр — счётчики книги не меняются.
      const rental = manager.create(BookRental, {
        userId,
        libraryId: book.libraryId,
        bookId: book.id,
        dateStart: dto.dateStart,
        dateEnd: dto.dateEnd,
        status: 'reserved',
      });

      return await manager.save(rental);
    });
  }

  async findByUser(
    userId: ID,
    params: FindUserRentalsParams,
  ): Promise<BookRental[]> {
    return this.findAll({ userId, ...params });
  }

  async findAll(params: FindRentalsParams): Promise<BookRental[]> {
    const query = this.rentalsRepository
      .createQueryBuilder('rental')
      .leftJoinAndSelect('rental.book', 'book')
      .leftJoinAndSelect('rental.library', 'library')
      .leftJoinAndSelect('rental.user', 'user')
      .orderBy('rental.id', 'DESC')
      .skip(params.offset)
      .take(params.limit);

    if (params.userId !== undefined) {
      query.andWhere('rental.userId = :userId', { userId: params.userId });
    }
    if (params.libraryId !== undefined) {
      query.andWhere('rental.libraryId = :libraryId', {
        libraryId: params.libraryId,
      });
    }
    if (params.status !== undefined) {
      query.andWhere('rental.status = :status', { status: params.status });
    }

    return query.getMany();
  }

  async cancelByClient(rentalId: ID, userId: ID): Promise<BookRental> {
    return this.dataSource.transaction(async (manager) => {
      const rental = await manager.findOne(BookRental, {
        where: { id: rentalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rental) {
        throw new NotFoundException('Аренда не найдена');
      }

      if (rental.userId !== userId) {
        throw new ForbiddenException('Нельзя отменить чужую бронь');
      }

      // Клиент отменяет только свои брони в статусе reserved (раздел 2, п. 11).
      if (rental.status !== 'reserved') {
        throw new BadRequestException(
          'Отменить можно только бронь в статусе reserved',
        );
      }

      // reserved не занимает экземпляр — счётчики книги не меняются.
      rental.status = 'cancelled';
      return await manager.save(rental);
    });
  }

  async changeStatus(rentalId: ID, status: RentalStatus): Promise<BookRental> {
    return this.dataSource.transaction(async (manager) => {
      const rental = await manager.findOne(BookRental, {
        where: { id: rentalId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!rental) {
        throw new NotFoundException('Аренда не найдена');
      }

      const allowed = STATUS_TRANSITIONS[rental.status];
      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Недопустимый переход статуса: ${rental.status} → ${status}`,
        );
      }

      const delta =
        COUNTER_DELTAS[`${rental.status}>${status}`] ?? 0;

      if (delta !== 0) {
        // Счётчики книги пересчитываются под блокировкой строки книги.
        const book = await manager.findOne(Book, {
          where: { id: rental.bookId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!book) {
          throw new NotFoundException('Книга не найдена');
        }

        book.availableCopies = clampCopies(
          book.availableCopies + delta,
          book.totalCopies,
        );
        book.isAvailable = book.availableCopies > 0;
        await manager.save(book);
      }

      rental.status = status;
      return await manager.save(rental);
    });
  }

  // ---- Проверка активных аренд для LibrariesModule (раздел 2, п. 12) ----

  async hasActiveRentalsForBook(bookId: ID): Promise<boolean> {
    const count = await this.rentalsRepository.count({
      where: { bookId, status: In(ACTIVE_STATUSES) },
    });
    return count > 0;
  }

  async hasActiveRentalsForLibrary(libraryId: ID): Promise<boolean> {
    const count = await this.rentalsRepository.count({
      where: { libraryId, status: In(ACTIVE_STATUSES) },
    });
    return count > 0;
  }

  // ---- Внутренние проверки ----

  /**
   * Правила дат (спецификация, раздел 2, п. 10):
   * формат YYYY-MM-DD, начало не в прошлом, конец не раньше начала,
   * длительность не больше 30 дней.
   */
  private assertDatesValid(dateStart: string, dateEnd: string): void {
    if (!isValidDate(dateStart) || !isValidDate(dateEnd)) {
      throw new BadRequestException(
        'Некорректная дата: ожидается YYYY-MM-DD',
      );
    }

    if (dateEnd < dateStart) {
      throw new BadRequestException(
        'dateEnd не может быть раньше dateStart',
      );
    }

    if (dateStart < todayString()) {
      throw new BadRequestException('Дата начала не может быть в прошлом');
    }

    const days = daysBetween(dateStart, dateEnd);
    if (days > MAX_RENTAL_DAYS) {
      throw new BadRequestException(
        `Максимальная длительность брони — ${MAX_RENTAL_DAYS} дней`,
      );
    }
  }
}
