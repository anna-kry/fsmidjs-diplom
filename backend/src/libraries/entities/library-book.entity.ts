import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';
import { Book } from './book.entity';
import { Library } from './library.entity';

/**
 * Экземпляры книги в конкретной библиотеке.
 * Позволяет одной книге быть в нескольких библиотеках с разным числом копий.
 */
@Entity('library_books')
@Index('idx_library_books_book', ['bookId'])
@Index('idx_library_books_library', ['libraryId'])
@Index('idx_library_books_book_library', ['bookId', 'libraryId'], {
  unique: true,
})
@Check('chk_library_books_total_copies', '"totalCopies" >= 1')
@Check(
  'chk_library_books_available_copies',
  '"availableCopies" >= 0 AND "availableCopies" <= "totalCopies"',
)
export class LibraryBook {
  @PrimaryGeneratedColumn()
  id: ID;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @Column()
  bookId: ID;

  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'libraryId' })
  library: Library;

  @Column()
  libraryId: ID;

  @Column({ type: 'int', default: 1 })
  totalCopies: number;

  @Column({ type: 'int', default: 1 })
  availableCopies: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}