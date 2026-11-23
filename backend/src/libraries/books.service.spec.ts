import 'reflect-metadata';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdtemp, readdir, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Repository } from 'typeorm';
import {
  CoverFile,
  removeCoverFile,
  saveCoverFile,
  validateCoverFile,
} from './cover-upload.config';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { Book } from './entities/book.entity';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import { BooksService } from './books.service';
import { ActiveRentalsChecker } from './interfaces/active-rentals-checker.interface';

interface QueryBuilderMock {
  leftJoinAndSelect: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
  getCount: jest.Mock;
}

interface BooksRepositoryMock {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  find: jest.Mock;
}

interface LibrariesRepositoryMock {
  findOneBy: jest.Mock;
  findBy: jest.Mock;
}

interface LibraryBooksRepositoryMock {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  find: jest.Mock;
}

interface CheckerMock {
  hasActiveRentalsForBook: jest.Mock;
  hasActiveRentalsForLibrary: jest.Mock;
  hasActiveRentalsForLibraryBook: jest.Mock;
}

const UPLOADS_DIR = '/tmp/uploads-for-unit-tests';

function createDto(overrides: Partial<CreateBookDto> = {}): CreateBookDto {
  return {
    title: 'Мастер и Маргарита',
    author: 'Михаил Булгаков',
    year: 1967,
    description: 'Роман',
    libraries: [{ libraryId: 1, totalCopies: 3 }],
    ...overrides,
  };
}

function createLibraryBook(overrides: Partial<LibraryBook> = {}): LibraryBook {
  const library = { id: 1, name: 'Центральная', address: 'ул. Ленина, 1' } as Library;
  return {
    id: 1,
    bookId: 10,
    libraryId: 1,
    library,
    book: null as any,
    totalCopies: 3,
    availableCopies: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as LibraryBook;
}

function createBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 10,
    title: 'Мастер и Маргарита',
    author: 'Михаил Булгаков',
    year: 1967,
    description: 'Роман',
    coverImage: null,
    libraryBooks: [createLibraryBook()],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Book;
}

describe('BooksService', () => {
  let queryBuilder: QueryBuilderMock;
  let booksRepository: BooksRepositoryMock;
  let librariesRepository: LibrariesRepositoryMock;
  let libraryBooksRepository: LibraryBooksRepositoryMock;
  let checker: CheckerMock;
  let configService: ConfigService;
  let booksService: BooksService;

  beforeEach(() => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
    };
    booksRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      findOne: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((data: Partial<Book>) => ({ ...data }) as Book),
      save: jest
        .fn()
        .mockImplementation((data: Partial<Book>) =>
          Promise.resolve({ id: 10, ...data } as Book),
        ),
      remove: jest.fn().mockResolvedValue(undefined),
      find: jest.fn().mockResolvedValue([]),
    };
    librariesRepository = {
      findOneBy: jest.fn(),
      findBy: jest.fn(),
    };
    libraryBooksRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    checker = {
      hasActiveRentalsForBook: jest.fn().mockResolvedValue(false),
      hasActiveRentalsForLibrary: jest.fn().mockResolvedValue(false),
      hasActiveRentalsForLibraryBook: jest.fn().mockResolvedValue(false),
    };
    configService = {
      get: jest.fn().mockReturnValue(UPLOADS_DIR),
    } as unknown as ConfigService;

    booksService = new BooksService(
      booksRepository as unknown as Repository<Book>,
      librariesRepository as unknown as Repository<Library>,
      libraryBooksRepository as unknown as Repository<LibraryBook>,
      checker as unknown as ActiveRentalsChecker,
      configService,
    );
  });

  describe('findAll: получение списка', () => {
    it('соединяет библиотеки через libraryBooks и возвращает книги с общим числом', async () => {
      const books = [createBook()];
      queryBuilder.getMany.mockResolvedValue(books);
      queryBuilder.getCount.mockResolvedValue(42);

      const result = await booksService.findAll({
        library: '',
        author: '',
        title: '',
        availableOnly: false,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'book.libraryBooks',
        'libraryBook',
      );
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'libraryBook.library',
        'library',
      );
      expect(result.books).toBe(books);
      // total — число всех подходящих книг, а не размер страницы.
      expect(result.total).toBe(42);
    });

    it('применяет пагинацию limit/offset', async () => {
      await booksService.findAll({
        library: '',
        author: '',
        title: '',
        availableOnly: false,
        limit: 5,
        offset: 10,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('фильтр по id библиотеки (числовой)', async () => {
      await booksService.findAll({
        library: '7',
        author: '',
        title: '',
        availableOnly: false,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'libraryBook.libraryId = :libraryId',
        { libraryId: 7 },
      );
    });

    it('фильтр по названию библиотеки (не число)', async () => {
      await booksService.findAll({
        library: 'север',
        author: '',
        title: '',
        availableOnly: false,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'library.name ILIKE :libraryName',
        { libraryName: '%север%' },
      );
    });

    it('фильтр по автору — частичное совпадение с экранированием', async () => {
      await booksService.findAll({
        library: '',
        author: 'бул%гаков',
        title: '',
        availableOnly: false,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.author ILIKE :author',
        { author: '%бул\\%гаков%' },
      );
    });

    it('фильтр по названию — частичное совпадение с экранированием', async () => {
      await booksService.findAll({
        library: '',
        author: '',
        title: 'пр',
        availableOnly: false,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.title ILIKE :title',
        { title: '%пр%' },
      );
    });

    it('availableOnly добавляет условие по свободным экземплярам', async () => {
      await booksService.findAll({
        library: '',
        author: '',
        title: '',
        availableOnly: true,
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'libraryBook.availableCopies > 0',
      );
    });

    it('комбинация фильтров применяется одновременно', async () => {
      await booksService.findAll({
        library: '3',
        author: 'толстой',
        title: 'война',
        availableOnly: true,
        limit: 10,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(4);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'libraryBook.libraryId = :libraryId',
        { libraryId: 3 },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.author ILIKE :author',
        { author: '%толстой%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'book.title ILIKE :title',
        { title: '%война%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'libraryBook.availableCopies > 0',
      );
    });
  });

  describe('findById: книга по id', () => {
    it('возвращает книгу вместе с libraryBooks и библиотеками', async () => {
      const book = createBook();
      booksRepository.findOne.mockResolvedValue(book);

      const result = await booksService.findById(10);

      expect(booksRepository.findOne).toHaveBeenCalledWith({
        where: { id: 10 },
        relations: { libraryBooks: { library: true } },
      });
      expect(result).toBe(book);
    });

    it('выбрасывает 404, если книги нет', async () => {
      booksRepository.findOne.mockResolvedValue(null);

      await expect(booksService.findById(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create: создание книги', () => {
    it('возвращает 400, если библиотек не указано', async () => {
      await expect(booksService.create(createDto({ libraries: [] }))).rejects.toThrow(
        BadRequestException,
      );
      expect(booksRepository.save).not.toHaveBeenCalled();
    });

    it('возвращает 400, если библиотеки не существуют', async () => {
      librariesRepository.findBy.mockResolvedValue([]);

      await expect(booksService.create(createDto())).rejects.toThrow(
        BadRequestException,
      );
      expect(booksRepository.save).not.toHaveBeenCalled();
    });

    it('создаёт книгу со связями и счётчиками: availableCopies = totalCopies', async () => {
      const library = { id: 1, name: 'Центральная', address: 'ул. Ленина, 1' };
      librariesRepository.findBy.mockResolvedValue([library]);

      const result = await booksService.create(createDto({ libraries: [{ libraryId: 1, totalCopies: 4 }] }));

      expect(booksRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Мастер и Маргарита',
          author: 'Михаил Булгаков',
          libraryBooks: expect.arrayContaining([
            expect.objectContaining({
              library,
              libraryId: 1,
              totalCopies: 4,
              availableCopies: 4,
            }),
          ]),
        }),
      );
      expect(result.libraryBooks[0].availableCopies).toBe(4);
    });

    it('удаляет сохранённый файл, если запись в БД не удалась', async () => {
      const uploadsDir = await mkdtemp(join(tmpdir(), 'covers-create-test-'));
      (configService.get as jest.Mock).mockReturnValue(uploadsDir);
      librariesRepository.findBy.mockResolvedValue([{ id: 1 } as Library]);
      booksRepository.save.mockRejectedValueOnce(new Error('db down'));

      const file: CoverFile = {
        originalname: 'cover.png',
        mimetype: 'image/png',
        size: 4,
        buffer: Buffer.from([1, 2, 3, 4]),
      };

      await expect(booksService.create(createDto(), file)).rejects.toThrow(
        'db down',
      );

      expect(await readdir(uploadsDir)).toEqual([]);
      await rm(uploadsDir, { recursive: true, force: true });
    });
  });

  describe('update: изменение книги и пересчёт экземпляров', () => {
    async function prepareExisting(book: Book): Promise<void> {
      booksRepository.findOne.mockResolvedValue(book);
    }

    it('увеличение totalCopies увеличивает availableCopies на ту же разницу', async () => {
      await prepareExisting(
        createBook({ libraryBooks: [createLibraryBook({ totalCopies: 3, availableCopies: 3 })] }),
      );
      librariesRepository.findBy.mockResolvedValue([{ id: 1 } as Library]);

      const result = await booksService.update(10, {
        libraries: [{ libraryId: 1, totalCopies: 6 }],
      } as UpdateBookDto);

      expect(result.libraryBooks[0].totalCopies).toBe(6);
      expect(result.libraryBooks[0].availableCopies).toBe(6);
    });

    it('выданные экземпляры не возвращаются в доступные при уменьшении', async () => {
      // На полке 1 из 5, значит 4 экземпляра на руках у читателей.
      await prepareExisting(
        createBook({ libraryBooks: [createLibraryBook({ totalCopies: 5, availableCopies: 1 })] }),
      );
      librariesRepository.findBy.mockResolvedValue([{ id: 1 } as Library]);

      const result = await booksService.update(10, {
        libraries: [{ libraryId: 1, totalCopies: 3 }],
      } as UpdateBookDto);

      expect(result.libraryBooks[0].totalCopies).toBe(3);
      // 3 - 4 (на руках) < 0, поэтому не меньше нуля.
      expect(result.libraryBooks[0].availableCopies).toBe(0);
    });

    it('availableCopies никогда не превышает новый totalCopies', async () => {
      await prepareExisting(
        createBook({ libraryBooks: [createLibraryBook({ totalCopies: 5, availableCopies: 3 })] }),
      );
      librariesRepository.findBy.mockResolvedValue([{ id: 1 } as Library]);

      const result = await booksService.update(10, {
        libraries: [{ libraryId: 1, totalCopies: 1 }],
      } as UpdateBookDto);

      expect(result.libraryBooks[0].availableCopies).toBeLessThanOrEqual(result.libraryBooks[0].totalCopies);
      expect(result.libraryBooks[0].availableCopies).toBeGreaterThanOrEqual(0);
    });

    it('без изменения libraries счётчики не трогаются', async () => {
      await prepareExisting(
        createBook({ libraryBooks: [createLibraryBook({ totalCopies: 5, availableCopies: 1 })] }),
      );

      const result = await booksService.update(10, {
        title: 'Новое название',
      } as UpdateBookDto);

      expect(result.title).toBe('Новое название');
      expect(result.libraryBooks[0].totalCopies).toBe(5);
      expect(result.libraryBooks[0].availableCopies).toBe(1);
    });

    it('выбрасывает 404, если книги нет', async () => {
      booksRepository.findOne.mockResolvedValue(null);

      await expect(
        booksService.update(999, { title: 'x' } as UpdateBookDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('возвращает 400 при указании несуществующей библиотеки', async () => {
      await prepareExisting(createBook());
      librariesRepository.findBy.mockResolvedValue([]);

      await expect(
        booksService.update(10, { libraries: [{ libraryId: 999, totalCopies: 1 }] } as UpdateBookDto),
      ).rejects.toThrow(BadRequestException);
      expect(booksRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('delete: удаление книги', () => {
    it('выбрасывает 404, если книги нет', async () => {
      booksRepository.findOne.mockResolvedValue(null);

      await expect(booksService.delete(999)).rejects.toThrow(
        NotFoundException,
      );
      expect(booksRepository.remove).not.toHaveBeenCalled();
    });

    it('возвращает 409, если по книге есть активные аренды', async () => {
      const book = createBook({ libraryBooks: [createLibraryBook({ id: 5 })] });
      booksRepository.findOne.mockResolvedValue(book);
      checker.hasActiveRentalsForLibraryBook.mockResolvedValue(true);

      await expect(booksService.delete(10)).rejects.toThrow(
        ConflictException,
      );
      expect(booksRepository.remove).not.toHaveBeenCalled();
    });

    it('удаляет книгу, когда активных аренд нет', async () => {
      const book = createBook();
      booksRepository.findOne.mockResolvedValue(book);

      await booksService.delete(10);

      expect(checker.hasActiveRentalsForLibraryBook).toHaveBeenCalledWith(1);
      expect(booksRepository.remove).toHaveBeenCalledWith(book);
    });
  });
});

describe('validateCoverFile: проверка обложки', () => {
  function coverFile(overrides: Partial<CoverFile> = {}): CoverFile {
    return {
      originalname: 'cover.png',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from(''),
      ...overrides,
    };
  }

  it('пропускает изображение jpeg/png/webp до 2 МБ', () => {
    expect(() => validateCoverFile(coverFile())).not.toThrow();
    expect(() =>
      validateCoverFile(coverFile({ mimetype: 'image/jpeg' })),
    ).not.toThrow();
    expect(() =>
      validateCoverFile(
        coverFile({ mimetype: 'image/webp', size: 2 * 1024 * 1024 }),
      ),
    ).not.toThrow();
  });

  it('отклоняет неподдерживаемый тип файла: 400', () => {
    expect(() =>
      validateCoverFile(
        coverFile({ originalname: 'notes.txt', mimetype: 'text/plain' }),
      ),
    ).toThrow(BadRequestException);
  });

  it('отклоняет файл больше 2 МБ: 400', () => {
    expect(() =>
      validateCoverFile(coverFile({ size: 2 * 1024 * 1024 + 1 })),
    ).toThrow(BadRequestException);
  });
});

describe('saveCoverFile и removeCoverFile: работа с файлами', () => {
  let uploadsDir: string;

  beforeEach(async () => {
    uploadsDir = await mkdtemp(join(tmpdir(), 'covers-test-'));
  });

  afterEach(async () => {
    await rm(uploadsDir, { recursive: true, force: true });
  });

  it('сохраняет файл и возвращает путь /uploads/<uuid>.png', async () => {
    const path = await saveCoverFile(uploadsDir, {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from([1, 2, 3, 4]),
    });

    expect(path).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    const filePath = join(uploadsDir, path.replace('/uploads/', ''));
    const info = await stat(filePath);
    expect(info.size).toBe(4);
  });

  it('не создаёт файл при неподдерживаемом типе', async () => {
    await expect(
      saveCoverFile(uploadsDir, {
        originalname: 'evil.sh',
        mimetype: 'application/x-sh',
        size: 10,
        buffer: Buffer.from(''),
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('удаляет файл и не падает, если его уже нет', async () => {
    const path = await saveCoverFile(uploadsDir, {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from([1, 2, 3, 4]),
    });

    await removeCoverFile(uploadsDir, path);
    await expect(
      stat(join(uploadsDir, path.replace('/uploads/', ''))),
    ).rejects.toThrow();

    // Повторное удаление и подозрительный путь — без ошибок.
    await expect(removeCoverFile(uploadsDir, path)).resolves.toBeUndefined();
    await expect(
      removeCoverFile(uploadsDir, '/uploads/../../etc/passwd'),
    ).resolves.toBeUndefined();
  });
});