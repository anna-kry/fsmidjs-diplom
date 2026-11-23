import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, FindOperator, Repository } from 'typeorm';
import { LibraryBook } from '../libraries/entities/library-book.entity';
import { BookRental } from './entities/book-rental.entity';
import { RentalsService } from './rentals.service';

/** Условие WHERE, переданное менеджеру при count. */
interface CountWhere {
  bookId?: number;
  libraryId?: number;
  userId?: number;
  status?: FindOperator<number | string>;
  dateStart?: FindOperator<string>;
  dateEnd?: FindOperator<string>;
}

interface ManagerMock {
  findOne: jest.Mock;
  count: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
}

interface RentalsRepositoryMock {
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
}

interface LibraryBooksRepositoryMock {
  findOne: jest.Mock;
}

interface QueryBuilderMock {
  leftJoinAndSelect: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
}

/** Локальная дата YYYY-MM-DD. */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function today(): string {
  return formatDate(new Date());
}

function plusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function createLibraryBook(overrides: Partial<LibraryBook> = {}): LibraryBook {
  return {
    id: 1,
    bookId: 10,
    libraryId: 1,
    totalCopies: 1,
    availableCopies: 1,
    book: null as any,
    library: null as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as LibraryBook;
}

function createRental(overrides: Partial<BookRental> = {}): BookRental {
  return {
    id: 100,
    userId: 5,
    libraryId: 1,
    bookId: 10,
    dateStart: today(),
    dateEnd: plusDays(5),
    status: 'reserved',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as BookRental;
}

describe('RentalsService', () => {
  let manager: ManagerMock;
  let rentalsRepository: RentalsRepositoryMock;
  let libraryBooksRepository: LibraryBooksRepositoryMock;
  let queryBuilder: QueryBuilderMock;
  let dataSource: DataSource;
  let service: RentalsService;

  // Что вернёт manager.findOne для LibraryBook и для аренды.
  let libraryBookResult: LibraryBook | null;
  let rentalResult: BookRental | null;

  beforeEach(() => {
    libraryBookResult = createLibraryBook();
    rentalResult = createRental();

    manager = {
      findOne: jest
        .fn()
        .mockImplementation((entity: unknown, _options?: unknown) => {
          if (entity === LibraryBook) {
            return Promise.resolve(libraryBookResult);
          }
          if (entity === BookRental) {
            return Promise.resolve(rentalResult);
          }
          return Promise.resolve(null);
        }),
      // По умолчанию пересечений нет.
      count: jest.fn().mockResolvedValue(0),
      create: jest
        .fn()
        .mockImplementation(
          (entity: unknown, data: Partial<BookRental>) =>
            ({ id: 101, ...data }) as BookRental,
        ),
      save: jest
        .fn()
        .mockImplementation((data: Partial<BookRental | LibraryBook>) =>
          Promise.resolve({ updatedAt: new Date(), ...data }),
        ),
    };

    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    rentalsRepository = {
      count: jest.fn().mockResolvedValue(0),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    libraryBooksRepository = {
      findOne: jest.fn(),
    };

    // Транзакция в unit-тестах выполняет колбэк сразу с мок-менеджером.
    dataSource = {
      transaction: jest.fn(
        (cb: (manager: ManagerMock) => Promise<unknown>) => cb(manager),
      ),
    } as unknown as DataSource;

    service = new RentalsService(
      rentalsRepository as unknown as Repository<BookRental>,
      libraryBooksRepository as unknown as Repository<LibraryBook>,
      dataSource,
    );
  });

  describe('create: правила дат', () => {
    const validDates = { dateStart: today(), dateEnd: plusDays(7) };

    it('создаёт бронь в статусе reserved, счётчики LibraryBook не меняются', async () => {
      const rental = await service.create(5, {
        bookId: 10,
        libraryId: 1,
        ...validDates,
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(manager.create).toHaveBeenCalledWith(BookRental, {
        userId: 5,
        libraryId: 1,
        bookId: 10,
        dateStart: validDates.dateStart,
        dateEnd: validDates.dateEnd,
        status: 'reserved',
      });
      // save вызывается только для брони — LibraryBook не затрагивается.
      expect(manager.save).toHaveBeenCalledTimes(1);
      expect(rental.status).toBe('reserved');
      expect(rental.id).toBe(101);
    });

    it('блокирует строку LibraryBook на время транзакции (pessimistic_write)', async () => {
      await service.create(5, {
        bookId: 10,
        libraryId: 1,
        ...validDates,
      });

      expect(manager.findOne).toHaveBeenCalledWith(LibraryBook, {
        where: { bookId: 10, libraryId: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('дата начала сегодня допустима (граница включительно)', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: today(),
        }),
      ).resolves.toMatchObject({ status: 'reserved' });
    });

    it('дата в прошлом: 400', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: plusDays(-1),
          dateEnd: plusDays(3),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('dateEnd раньше dateStart: 400', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: plusDays(5),
          dateEnd: plusDays(1),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('ровно 30 дней — допустимо (граница включительно)', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(30),
        }),
      ).resolves.toMatchObject({ status: 'reserved' });
    });

    it('31 день — 400', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(31),
        }),
      ).rejects.toThrow(BadRequestException);
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('несуществующая календарная дата (2026-02-30): 400', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: '2026-02-30',
          dateEnd: '2026-03-02',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('дата не в формате YYYY-MM-DD: 400', async () => {
      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: '30.12.2026',
          dateEnd: '31.12.2026',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('create: книга, библиотека и пересечение периодов', () => {
    it('LibraryBook не найдена: 404', async () => {
      libraryBookResult = null;

      await expect(
        service.create(5, {
          bookId: 999,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(3),
        }),
      ).rejects.toThrow(NotFoundException);
      expect(manager.create).not.toHaveBeenCalled();
    });

    it('пересечение проверяется по статусам reserved|active и границам включительно', async () => {
      await service.create(5, {
        bookId: 10,
        libraryId: 1,
        dateStart: '2030-01-10',
        dateEnd: '2030-01-20',
      });

      expect(manager.count).toHaveBeenCalledTimes(1);
      const [entity, where] = manager.count.mock.calls[0] as [
        unknown,
        { where: CountWhere },
      ];
      expect(entity).toBe(BookRental);
      expect(where.where.bookId).toBe(10);
      expect(where.where.libraryId).toBe(1);
      expect(where.where.status?.type).toBe('in');
      expect(where.where.status?.value).toEqual(['reserved', 'active']);
      // existing.dateStart <= new.dateEnd
      expect(where.where.dateStart?.type).toBe('lessThanOrEqual');
      expect(where.where.dateStart?.value).toBe('2030-01-20');
      // existing.dateEnd >= new.dateStart
      expect(where.where.dateEnd?.type).toBe('moreThanOrEqual');
      expect(where.where.dateEnd?.value).toBe('2030-01-10');
    });

    it('totalCopies=1 и есть пересекающаяся бронь: 409', async () => {
      libraryBookResult = createLibraryBook({ totalCopies: 1, availableCopies: 1 });
      manager.count.mockResolvedValue(1);

      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(5),
        }),
      ).rejects.toThrow(ConflictException);
      expect(manager.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('totalCopies=2 и одна пересекающаяся бронь: создание проходит', async () => {
      libraryBookResult = createLibraryBook({ totalCopies: 2, availableCopies: 1 });
      manager.count.mockResolvedValue(1);

      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(5),
        }),
      ).resolves.toMatchObject({ status: 'reserved' });
    });

    it('пересечений нет: создание проходит', async () => {
      manager.count.mockResolvedValue(0);

      await expect(
        service.create(5, {
          bookId: 10,
          libraryId: 1,
          dateStart: today(),
          dateEnd: plusDays(5),
        }),
      ).resolves.toMatchObject({ status: 'reserved' });
    });
  });

  describe('cancelByClient: отмена своей брони', () => {
    it('своя бронь в статусе reserved переводится в cancelled', async () => {
      rentalResult = createRental({ userId: 5, status: 'reserved' });

      const result = await service.cancelByClient(100, 5);

      expect(result.status).toBe('cancelled');
      expect(manager.save).toHaveBeenCalledTimes(1);
      // reserved не занимал экземпляр — LibraryBook не изменяется.
      expect(manager.findOne).toHaveBeenCalledWith(
        BookRental,
        expect.objectContaining({
          lock: { mode: 'pessimistic_write' },
        }),
      );
    });

    it('чужая бронь: 403', async () => {
      rentalResult = createRental({ userId: 7, status: 'reserved' });

      await expect(service.cancelByClient(100, 5)).rejects.toThrow(
        ForbiddenException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('бронь в статусе active: 400', async () => {
      rentalResult = createRental({ userId: 5, status: 'active' });

      await expect(service.cancelByClient(100, 5)).rejects.toThrow(
        BadRequestException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('бронь в статусе completed: 400', async () => {
      rentalResult = createRental({ userId: 5, status: 'completed' });

      await expect(service.cancelByClient(100, 5)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('несуществующая бронь: 404', async () => {
      rentalResult = null;

      await expect(service.cancelByClient(999, 5)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('changeStatus: допустимые переходы и счётчики', () => {
    it('reserved → active уменьшает availableCopies на 1', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 3,
        availableCopies: 2,
      });
      rentalResult = createRental({ status: 'reserved' });

      const result = await service.changeStatus(100, 'active');

      expect(result.status).toBe('active');
      expect(libraryBookResult.availableCopies).toBe(1);
      // save вызывается для LibraryBook и для аренды.
      expect(manager.save).toHaveBeenCalledTimes(2);
      expect(manager.findOne).toHaveBeenCalledWith(LibraryBook, {
        where: { bookId: 10, libraryId: 1 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('reserved → active при availableCopies=0 не уходит ниже нуля', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 1,
        availableCopies: 0,
      });
      rentalResult = createRental({ status: 'reserved' });

      await service.changeStatus(100, 'active');

      expect(libraryBookResult.availableCopies).toBe(0);
    });

    it('active → completed увеличивает availableCopies на 1', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 2,
        availableCopies: 0,
      });
      rentalResult = createRental({ status: 'active' });

      const result = await service.changeStatus(100, 'completed');

      expect(result.status).toBe('completed');
      expect(libraryBookResult.availableCopies).toBe(1);
    });

    it('active → cancelled увеличивает availableCopies на 1', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 1,
        availableCopies: 0,
      });
      rentalResult = createRental({ status: 'active' });

      const result = await service.changeStatus(100, 'cancelled');

      expect(result.status).toBe('cancelled');
      expect(libraryBookResult.availableCopies).toBe(1);
    });

    it('availableCopies не превышает totalCopies', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 2,
        availableCopies: 2,
      });
      rentalResult = createRental({ status: 'active' });

      await service.changeStatus(100, 'completed');

      expect(libraryBookResult.availableCopies).toBe(2);
    });

    it('reserved → cancelled не трогает счётчики LibraryBook', async () => {
      libraryBookResult = createLibraryBook({
        totalCopies: 1,
        availableCopies: 1,
      });
      rentalResult = createRental({ status: 'reserved' });

      const result = await service.changeStatus(100, 'cancelled');

      expect(result.status).toBe('cancelled');
      // LibraryBook вообще не запрашивалась.
      expect(
        manager.findOne.mock.calls.filter(
          (call: [unknown]) => call[0] === LibraryBook,
        ),
      ).toHaveLength(0);
      expect(libraryBookResult.availableCopies).toBe(1);
    });

    it('reserved → completed: 400', async () => {
      rentalResult = createRental({ status: 'reserved' });

      await expect(service.changeStatus(100, 'completed')).rejects.toThrow(
        BadRequestException,
      );
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('completed → active: 400', async () => {
      rentalResult = createRental({ status: 'completed' });

      await expect(service.changeStatus(100, 'active')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('cancelled → completed: 400', async () => {
      rentalResult = createRental({ status: 'cancelled' });

      await expect(service.changeStatus(100, 'completed')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('переход в тот же статус: 400', async () => {
      rentalResult = createRental({ status: 'reserved' });

      await expect(service.changeStatus(100, 'reserved')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('несуществующая аренда: 404', async () => {
      rentalResult = null;

      await expect(service.changeStatus(999, 'active')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('hasActiveRentals: проверка перед удалением', () => {
    it('книга: true, если есть reserved или active', async () => {
      rentalsRepository.count.mockResolvedValue(1);

      await expect(service.hasActiveRentalsForBook(10)).resolves.toBe(true);
      expect(rentalsRepository.count).toHaveBeenCalledWith({
        where: {
          bookId: 10,
          status: expect.objectContaining({ type: 'in' }),
        },
      });
      const where = (rentalsRepository.count.mock.calls[0][0] as {
        where: { status: FindOperator<string> };
      }).where;
      expect(where.status.value).toEqual(['reserved', 'active']);
    });

    it('книга: false, когда активных аренд нет', async () => {
      rentalsRepository.count.mockResolvedValue(0);
      await expect(service.hasActiveRentalsForBook(10)).resolves.toBe(false);
    });

    it('библиотека: проверяется по libraryId', async () => {
      rentalsRepository.count.mockResolvedValue(1);

      await expect(service.hasActiveRentalsForLibrary(2)).resolves.toBe(true);
      expect(rentalsRepository.count).toHaveBeenCalledWith({
        where: {
          libraryId: 2,
          status: expect.objectContaining({ type: 'in' }),
        },
      });
    });

    it('LibraryBook: проверяется по bookId и libraryId', async () => {
      libraryBooksRepository.findOne.mockResolvedValue(createLibraryBook({ id: 1 }));
      rentalsRepository.count.mockResolvedValue(1);

      await expect(service.hasActiveRentalsForLibraryBook(1)).resolves.toBe(true);
      expect(libraryBooksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { bookId: true, libraryId: true },
      });
      expect(rentalsRepository.count).toHaveBeenCalledWith({
        where: {
          bookId: 10,
          libraryId: 1,
          status: expect.objectContaining({ type: 'in' }),
        },
      });
    });
  });

  describe('findAll / findByUser: списки с фильтрами', () => {
    it('поиск по пользователю добавляет фильтр userId', async () => {
      await service.findByUser(5, { limit: 20, offset: 0 });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'rental.userId = :userId',
        { userId: 5 },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
    });

    it('фильтры менеджера: userId, libraryId, status', async () => {
      await service.findAll({
        userId: 5,
        libraryId: 2,
        status: 'active',
        limit: 10,
        offset: 5,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'rental.userId = :userId',
        { userId: 5 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'rental.libraryId = :libraryId',
        { libraryId: 2 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'rental.status = :status',
        { status: 'active' },
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('без фильтров условий нет', async () => {
      await service.findAll({ limit: 20, offset: 0 });

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });
});