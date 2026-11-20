import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import {
  ActiveRentalsChecker,
  ACTIVE_RENTALS_CHECKER,
} from './interfaces/active-rentals-checker.interface';

/** Параметры поиска книг (DTO поиска структурно совпадает). */
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
  /** Сколько книг подходит под фильтры всего (без учёта limit/offset). */
  total: number;
}

/**
 * Книги: публичный поиск с фильтрами и административный CRUD.
 *
 * Счётчики экземпляров:
 * - при создании availableCopies = totalCopies (все экземпляры на полке);
 * - при смене totalCopies выданные экземпляры (totalCopies - availableCopies)
 *   сохраняются, новый availableCopies ограничен диапазоном 0..totalCopies.
 */
@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly booksRepository: Repository<Book>,
    @InjectRepository(Library)
    private readonly librariesRepository: Repository<Library>,
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
      .leftJoinAndSelect('book.library', 'library');

    if (params.library) {
      if (/^\d+$/.test(params.library)) {
        // Число в фильтре — id библиотеки.
        query.andWhere('book.libraryId = :libraryId', {
          libraryId: Number(params.library),
        });
      } else {
        // Иначе — частичное совпадение названия библиотеки.
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
      // availableOnly — есть хотя бы один свободный экземпляр.
      query.andWhere('book.availableCopies > 0');
    }

    // Общее число найденных книг для заголовка «Найдено: N …».
    // getCount() выполняет запрос на клоне и сам сбрасывает skip/take,
    // поэтому total не зависит от пагинации.
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
      relations: { library: true },
    });

    if (!book) {
      throw new NotFoundException('Книга не найдена');
    }

    return book;
  }

  async create(dto: CreateBookDto, file?: CoverFile): Promise<Book> {
    const library = await this.librariesRepository.findOneBy({
      id: dto.libraryId,
    });

    if (!library) {
      throw new BadRequestException('Библиотеки с таким id не существует');
    }

    // Файл сохраняется до записи в БД: если сохранение не удастся,
    // файл будет удалён и в базе не останется битой ссылки.
    const coverImage = file ? await saveCoverFile(this.uploadsDir, file) : null;

    try {
      const totalCopies = dto.totalCopies;
      const book = this.booksRepository.create({
        title: dto.title,
        author: dto.author,
        year: dto.year,
        description: dto.description,
        library,
        libraryId: library.id,
        totalCopies,
        availableCopies: totalCopies,
        isAvailable: totalCopies > 0,
        coverImage,
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

    // Новая библиотека проверяется до записи файла обложки.
    let nextLibrary: Library | null = null;
    if (dto.libraryId !== undefined) {
      nextLibrary = await this.librariesRepository.findOneBy({
        id: dto.libraryId,
      });

      if (!nextLibrary) {
        throw new BadRequestException('Библиотеки с таким id не существует');
      }
    }

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
      if (nextLibrary) {
        book.library = nextLibrary;
        book.libraryId = nextLibrary.id;
      }

      if (dto.totalCopies !== undefined && dto.totalCopies !== book.totalCopies) {
        // Выданные экземпляры не «возвращаются» на полку:
        // availableCopies = новый totalCopies минус то, что на руках.
        const issued = book.totalCopies - book.availableCopies;
        book.availableCopies = Math.min(
          Math.max(dto.totalCopies - issued, 0),
          dto.totalCopies,
        );
        book.totalCopies = dto.totalCopies;
        book.isAvailable = book.availableCopies > 0;
      }

      if (newCoverImage) {
        book.coverImage = newCoverImage;
      }

      const updated = await this.booksRepository.save(book);

      // Старая обложка удаляется только после успешного обновления.
      if (newCoverImage && previousCoverImage) {
        await removeCoverFile(this.uploadsDir, previousCoverImage);
      }

      return updated;
    } catch (error) {
      // Новый файл не должен остаться на диске, если запись не удалась.
      if (newCoverImage) {
        await removeCoverFile(this.uploadsDir, newCoverImage);
      }
      throw error;
    }
  }

  async delete(id: ID): Promise<void> {
    const book = await this.findById(id);

    if (await this.activeRentals.hasActiveRentalsForBook(id)) {
      throw new ConflictException(
        'Нельзя удалить книгу: по ней есть активные аренды',
      );
    }

    await this.booksRepository.remove(book);
    await removeCoverFile(this.uploadsDir, book.coverImage);
  }
}
