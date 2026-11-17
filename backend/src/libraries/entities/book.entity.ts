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
import { Library } from './library.entity';

/**
 * Книга каталога (спецификация, раздел 4).
 * Индексы — по title, author, libraryId; количество экземпляров
 * ограничено проверками на уровне таблицы.
 */
@Entity('books')
@Index('idx_books_title', ['title'])
@Index('idx_books_author', ['author'])
@Index('idx_books_library', ['libraryId'])
@Check('chk_books_total_copies', '"totalCopies" >= 1')
@Check(
  'chk_books_available_copies',
  '"availableCopies" >= 0 AND "availableCopies" <= "totalCopies"',
)
export class Book {
  @PrimaryGeneratedColumn()
  id: ID;

  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'libraryId' })
  library: Library;

  @Column()
  libraryId: ID;

  @Column({ length: 300 })
  title: string;

  @Column({ length: 200 })
  author: string;

  @Column({ type: 'int', nullable: true })
  year: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  /** Путь вида `/uploads/<uuid>.jpg`, null — обложки нет. */
  @Column({ nullable: true })
  coverImage: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'int', default: 1 })
  totalCopies: number;

  @Column({ type: 'int', default: 1 })
  availableCopies: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
