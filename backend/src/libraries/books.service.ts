import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { escapeLike } from '../common/utils/escape-like';
import { ID } from '../common/types/id.type';
import {
  CoverFile,
  removeCoverFile,
  saveCoverFile,
} from './cover-upload.config';
import { CreateBookDto, UpdateBookDto } from './dto/book.dto';
import { Book } from './entities/book.entity';
import { Library } from './entities/library.entity';
import { LibraryBook } from './entities/library-book.entity';
import {
  ActiveRentalsChecker,
  ACTIVE_RENTALS_CHECKER,
} from './interfaces/active-rentals-checker.interface';

/** Параметры поиска книг. */
export interface SearchBooksParams {
  library: string;
  author: string;
  title: string;
  availableOnly: boolean;
  limit: number;
  offset: number;
}

/** Результат поиска: страница книг + общее число подходящих записей. */
export interface SearchBooksResult {
  books: Book[];
  total: number;
}

/**
 * Книги: публичный поиск с фильтрами и административный CRUD.
 *
 * Счётчики экземпляров хранятся в LibraryBook:
 * - при создании создаётся LibraryBook с availableCopies = totalCopies;
 * - при смене totalCopies в конкретной библиотеке выданные экземпляры
 *   сохраняются, новый availableCopies ограничен диапазоном 0..totalCopies.
 */
@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly booksRepository: Repository<Book>,
    @InjectRepository(Library)
    private readonly librariesRepository: Repository<Library>,
    @InjectRepository(LibraryBook)
    private readonly libraryBooksRepository: Repository<LibraryBook>,
    @Inject(ACTIVE_RENTALS_CHECKER)
    private readonly activeRentals: ActiveRentalsChecker,
    private readonly configService: ConfigService,
  ) {}

  private get uploadsDir(): string {
    return this.configService.get<string>('app.uploads.dir');
  }

  async findAll(params: SearchBooksParams): Promise<SearchBooksResult> {
    const query = this.booksRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.libraryBooks', 'libraryBook')
      .leftJoinAndSelect('libraryBook.library', 'library');

    if (params.library) {
      if (/^\d+$/.test(params.library)) {
        query.andWhere('libraryBook.libraryId = :libraryId', {
          libraryId: Number(params.library),
        });
      } else {
        query.andWhere('library.name ILIKE :libraryName', {
          libraryName: `%${escapeLike(params.library)}%`,
        });
      }
    }
    if (params.title) {
      query.andWhere('book.title ILIKE :title', {
        title: `%${escapeLike(params.title)}%`,
      });
    }
    if (params.author) {
      query.andWhere('book.author ILIKE :author', {
        author: `%${escapeLike(params.author)}%`,
      });
    }
    if (params.availableOnly) {
      query.andWhere('libraryBook.availableCopies > 0');
    }

    const total = await query.getCount();

    query.orderBy('book.id', 'ASC');
    query.skip(params.offset);
    query.take(params.limit);

    const books = await query.getMany();
    return { books, total };
  }

  async findById(id: ID): Promise<Book> {
    const book = await this.booksRepository.findOne({
      where: { id },
      relations: { libraryBooks: { library: true } },
    });

    if (!book) {
      throw new NotFoundException('Книга не найдена');
    }

    return book;
  }

  async create(dto: CreateBookDto, file?: CoverFile): Promise<Book> {
    if (!dto.libraries?.length) {
      throw new BadRequestException('Необходимо указать хотя бы одну библиотеку');
    }

    // Проверяем уникальность libraryId в запросе
    const libraryIds = dto.libraries.map((l) => l.libraryId);
    const uniqueLibraryIds = new Set(libraryIds);
    if (uniqueLibraryIds.size !== libraryIds.length) {
      throw new BadRequestException('Библиотеки не должны повторяться');
    }

    // Проверяем существование всех библиотек
    const libraries = await this.librariesRepository.findBy({
      id: In(libraryIds),
    });
    if (libraries.length !== libraryIds.length) {
      throw new BadRequestException('Одна или несколько библиотек не найдены');
    }

    // // Проверяем, что книга ещё не привязана к этим библиотекам
    // const existingLinks = await this.libraryBooksRepository.find({
    //   where: { libraryId: In(libraryIds) },
    //   select: { libraryId: true },
    // });
    // const existingLibIds = new Set((existingLinks ?? []).map((l) => l.libraryId));
    // for (const libId of libraryIds) {
    //   if (existingLibIds.has(libId)) {
    //     throw new ConflictException(
    //       `Книга уже привязана к библиотеке ${libId}`,
    //     );
    //   }
    // }

    const coverImage = file ? await saveCoverFile(this.uploadsDir, file) : null;

    try {
      const libraryBooks = dto.libraries.map((l) => {
        const library = libraries.find((lib) => lib.id === l.libraryId)!;
        return {
          library,
          libraryId: l.libraryId,
          totalCopies: l.totalCopies,
          availableCopies: l.totalCopies,
        };
      });

      const book = this.booksRepository.create({
        title: dto.title,
        author: dto.author,
        year: dto.year,
        description: dto.description,
        coverImage,
        libraryBooks,
      });

      return await this.booksRepository.save(book);
    } catch (error) {
      if (coverImage) {
        await removeCoverFile(this.uploadsDir, coverImage);
      }
      throw error;
    }
  }

  async update(id: ID, dto: UpdateBookDto, file?: CoverFile): Promise<Book> {
    const book = await this.findById(id);

    const newCoverImage = file
      ? await saveCoverFile(this.uploadsDir, file)
      : null;
    const previousCoverImage = book.coverImage;

    try {
      if (dto.title !== undefined) {
        book.title = dto.title;
      }
      if (dto.author !== undefined) {
        book.author = dto.author;
      }
      if (dto.year !== undefined) {
        book.year = dto.year;
      }
      if (dto.description !== undefined) {
        book.description = dto.description;
      }

      // Обновление/добавление библиотек через libraries array
      if (dto.libraries?.length) {
        const libraryIds = dto.libraries.map((l) => l.libraryId);
        const uniqueLibraryIds = new Set(libraryIds);
        if (uniqueLibraryIds.size !== libraryIds.length) {
          throw new BadRequestException('Библиотеки не должны повторяться');
        }

        const libraries = await this.librariesRepository.findBy({
          id: In(libraryIds),
        });
        if (libraries.length !== libraryIds.length) {
          throw new BadRequestException('Одна или несколько библиотек не найдены');
        }

        for (const l of dto.libraries) {
          const library = libraries.find((lib) => lib.id === l.libraryId)!;
          let libraryBook = book.libraryBooks.find(
            (lb) => lb.libraryId === l.libraryId,
          );
          if (libraryBook) {
            // Обновляем существующую
            const issued = libraryBook.totalCopies - libraryBook.availableCopies;
            libraryBook.availableCopies = Math.min(
              Math.max(l.totalCopies - issued, 0),
              l.totalCopies,
            );
            libraryBook.totalCopies = l.totalCopies;
          } else {
            // Добавляем новую
            libraryBook = this.libraryBooksRepository.create({
              book,
              bookId: book.id,
              library,
              libraryId: l.libraryId,
              totalCopies: l.totalCopies,
              availableCopies: l.totalCopies,
            });
            book.libraryBooks.push(libraryBook);
          }
        }
      }

      if (newCoverImage) {
        book.coverImage = newCoverImage;
      }

      const updated = await this.booksRepository.save(book);

      if (newCoverImage && previousCoverImage) {
        await removeCoverFile(this.uploadsDir, previousCoverImage);
      }

      return updated;
    } catch (error) {
      if (newCoverImage) {
        await removeCoverFile(this.uploadsDir, newCoverImage);
      }
      throw error;
    }
  }

  async delete(id: ID): Promise<void> {
    const book = await this.findById(id);

    for (const libraryBook of book.libraryBooks) {
      if (await this.activeRentals.hasActiveRentalsForLibraryBook(libraryBook.id)) {
        throw new ConflictException(
          'Нельзя удалить книгу: по ней есть активные аренды',
        );
      }
    }

    await this.booksRepository.remove(book);
    if (book.coverImage) {
      await removeCoverFile(this.uploadsDir, book.coverImage);
    }
  }

  /** Добавляет существующую книгу в новую библиотеку. */
  async addLibrary(
    bookId: ID,
    libraryId: ID,
    totalCopies: number,
  ): Promise<LibraryBook> {
    const book = await this.findById(bookId);

    const library = await this.librariesRepository.findOneBy({ id: libraryId });
    if (!library) {
      throw new BadRequestException('Библиотеки с таким id не существует');
    }

    const existing = await this.libraryBooksRepository.findOne({
      where: { bookId, libraryId },
    });
    if (existing) {
      throw new ConflictException(
        'Эта книга уже есть в указанной библиотеке',
      );
    }

    const libraryBook = this.libraryBooksRepository.create({
      book,
      bookId,
      library,
      libraryId,
      totalCopies,
      availableCopies: totalCopies,
    });

    return this.libraryBooksRepository.save(libraryBook);
  }

  /** Обновляет количество экземпляров книги в конкретной библиотеке. */
  async updateLibraryCopies(
    bookId: ID,
    libraryId: ID,
    totalCopies: number,
  ): Promise<LibraryBook> {
    const libraryBook = await this.libraryBooksRepository.findOne({
      where: { bookId, libraryId },
      relations: { book: true, library: true },
    });

    if (!libraryBook) {
      throw new NotFoundException('Связь книги с библиотекой не найдена');
    }

    const issued = libraryBook.totalCopies - libraryBook.availableCopies;
    libraryBook.availableCopies = Math.min(
      Math.max(totalCopies - issued, 0),
      totalCopies,
    );
    libraryBook.totalCopies = totalCopies;

    return this.libraryBooksRepository.save(libraryBook);
  }

  /** Удаляет связь книги с библиотекой. */
  async removeLibrary(bookId: ID, libraryId: ID): Promise<void> {
    const libraryBook = await this.libraryBooksRepository.findOne({
      where: { bookId, libraryId },
    });

    if (!libraryBook) {
      throw new NotFoundException('Связь книги с библиотекой не найдена');
    }

    if (await this.activeRentals.hasActiveRentalsForLibraryBook(libraryBook.id)) {
      throw new ConflictException(
        'Нельзя удалить связь: по ней есть активные аренды',
      );
    }

    await this.libraryBooksRepository.remove(libraryBook);
  }
}