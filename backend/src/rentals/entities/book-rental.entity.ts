import {
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
import { Book } from '../../libraries/entities/book.entity';
import { Library } from '../../libraries/entities/library.entity';
import { User } from '../../users/entities/user.entity';
import { RentalStatus } from '../interfaces/rental-service.interface';

/**
 * Аренда (бронь) книги (спецификация, раздел 4).
 *
 * Даты хранятся типом `date` и возвращаются строками YYYY-MM-DD
 * (спецификация, раздел 9, ловушка 5).
 *
 * Внешние ключи:
 * - bookId и libraryId — ON DELETE CASCADE: книга/библиотека с арендами
 *   `reserved|active` не удаляются (409 проверяется сервисом), поэтому
 *   каскад затрагивает только историю завершённых и отменённых аренд;
 * - userId — без каскада: удаления пользователей в API нет.
 */
@Entity('book_rentals')
@Index('idx_book_rentals_book_period', [
  'bookId',
  'status',
  'dateStart',
  'dateEnd',
])
export class BookRental {
  @PrimaryGeneratedColumn()
  id: ID;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: ID;

  @ManyToOne(() => Library, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'libraryId' })
  library: Library;

  @Column()
  libraryId: ID;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookId' })
  book: Book;

  @Column()
  bookId: ID;

  /** Дата начала брони, формат YYYY-MM-DD. */
  @Column({ type: 'date' })
  dateStart: string;

  /** Дата окончания брони (включительно), формат YYYY-MM-DD. */
  @Column({ type: 'date' })
  dateEnd: string;

  @Column({
    type: 'enum',
    enum: ['reserved', 'active', 'completed', 'cancelled'],
    default: 'reserved',
  })
  status: RentalStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
