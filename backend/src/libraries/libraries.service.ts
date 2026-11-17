import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ID } from '../common/types/id.type';
import { removeCoverFile } from './cover-upload.config';
import { CreateLibraryDto, UpdateLibraryDto } from './dto/library.dto';
import { Book } from './entities/book.entity';
import { Library } from './entities/library.entity';
import {
  ActiveRentalsChecker,
  ACTIVE_RENTALS_CHECKER,
} from './interfaces/active-rentals-checker.interface';

/**
 * Библиотеки: публичный список и административный CRUD.
 * Удаление библиотеки каскадно удаляет её книги (FK ON DELETE CASCADE).
 */
@Injectable()
export class LibrariesService {
  constructor(
    @InjectRepository(Library)
    private readonly librariesRepository: Repository<Library>,
    @InjectRepository(Book)
    private readonly booksRepository: Repository<Book>,
    @Inject(ACTIVE_RENTALS_CHECKER)
    private readonly activeRentals: ActiveRentalsChecker,
    private readonly configService: ConfigService,
  ) {}

  async findAll(params: { limit: number; offset: number }): Promise<Library[]> {
    return this.librariesRepository.find({
      order: { id: 'ASC' },
      skip: params.offset,
      take: params.limit,
    });
  }

  async findById(id: ID): Promise<Library> {
    const library = await this.librariesRepository.findOneBy({ id });

    if (!library) {
      throw new NotFoundException('Библиотека не найдена');
    }

    return library;
  }

  async create(dto: CreateLibraryDto): Promise<Library> {
    const library = this.librariesRepository.create({ ...dto });
    return this.librariesRepository.save(library);
  }

  async update(id: ID, dto: UpdateLibraryDto): Promise<Library> {
    const library = await this.findById(id);

    // Обновляются только присланные поля — остальные остаются прежними.
    if (dto.name !== undefined) {
      library.name = dto.name;
    }
    if (dto.address !== undefined) {
      library.address = dto.address;
    }
    if (dto.description !== undefined) {
      library.description = dto.description;
    }

    return this.librariesRepository.save(library);
  }

  async delete(id: ID): Promise<void> {
    const library = await this.findById(id);

    if (await this.activeRentals.hasActiveRentalsForLibrary(id)) {
      throw new ConflictException(
        'Нельзя удалить библиотеку: по её книгам есть активные аренды',
      );
    }

    // Обложки книг нужно собрать до удаления: книги удаляются каскадно.
    const books = await this.booksRepository.find({
      where: { libraryId: id },
      select: { coverImage: true },
    });

    await this.librariesRepository.remove(library);

    // Файлы обложек больше не нужны — убираем с диска.
    const uploadsDir = this.configService.get<string>('app.uploads.dir');
    for (const book of books) {
      await removeCoverFile(uploadsDir, book.coverImage);
    }
  }
}
