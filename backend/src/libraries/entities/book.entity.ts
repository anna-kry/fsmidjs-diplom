import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ID } from '../../common/types/id.type';
import { LibraryBook } from './library-book.entity';

/**
 * Книга каталога (спецификация, раздел 4).
 * Индексы — по title, author.
 * Количество экземпляров хранится в LibraryBook.
 */
@Entity('books')
@Index('idx_books_title', ['title'])
@Index('idx_books_author', ['author'])
export class Book {
  @PrimaryGeneratedColumn()
  id: ID;

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

  @OneToMany(() => LibraryBook, (lb) => lb.book, { cascade: true })
  libraryBooks: LibraryBook[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}