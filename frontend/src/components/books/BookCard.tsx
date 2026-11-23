import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Book, BookAvailability } from '../../types';

/**
 * Карточка книги (макет Figma, card 1:830): обложка слева, данные справа,
 * жёлтая кнопка «Забронировать» внизу. Общий класс book-card на всех страницах.
 * Обложка приходит относительным путём `/uploads/...` — используем как есть
 * (в dev её проксирует Vite, в prod раздаёт backend).
 *
 * @param variant - вариант оформления: 'default' (сетка) или 'slider' (свайпер,
 * фиксированная высота по макету «Новые поступления»).
 */
const BookCard = ({ book, variant = 'default' }: { book: Book; variant?: 'default' | 'slider' }) => {
  const [coverFailed, setCoverFailed] = useState(false);

  const showCover = Boolean(book.coverImage) && !coverFailed;

  // Вычисляем общую доступность из нового формата
  const totalAvailable = book.availability
    ? book.availability.reduce((sum, a) => sum + a.availableCopies, 0)
    : 0;
  const totalCopies = book.availability
    ? book.availability.reduce((sum, a) => sum + a.totalCopies, 0)
    : 0;
  const available = totalAvailable > 0;

  // Показываем доступность по библиотекам
  const availabilityItems = book.availability?.map((a: BookAvailability) => (
    <div key={a.library.id} className="book-card__availability-item">
      <span className="book-card__library-name">{a.library.name}</span>
      <span className="book-card__library-copies">
        {a.availableCopies} из {a.totalCopies}
      </span>
    </div>
  ));

  return (
    <article className={`book-card book-card--${variant}`}>
      <div className="book-card__body">
        <div className="book-card__cover">
          {showCover ? (
            <img
              className="book-card__image"
              src={book.coverImage ?? ''}
              alt={`Обложка книги «${book.title}»`}
              loading="lazy"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="book-card__placeholder" role="img" aria-label="Обложка отсутствует">
              <span>Нет обложки</span>
            </div>
          )}
        </div>

        <div className="book-card__content">
          <h2 className="book-card__title">
            <Link to={`/books/${book.id}`} className="book-card__link">
              {book.title}
            </Link>
          </h2>

          <div className="book-card__meta">
            <div className="book-card__row">
              <span className="book-card__label">Автор:</span>
              <span className="book-card__value">{book.author}</span>
            </div>
            {book.year != null && (
              <div className="book-card__row">
                <span className="book-card__label">Год:</span>
                <span className="book-card__value">{book.year}</span>
              </div>
            )}
            {book.description && (
              <div className="book-card__field">
                <span className="book-card__label">Описание:</span>
                <span className="book-card__value book-card__description">
                  {book.description}
                </span>
              </div>
            )}
            <div className="book-card__field">
              <span className="book-card__label">Доступность:</span>
              <div className="book-card__availability-list">
                {availabilityItems}
              </div>
            </div>
          </div>

          <div className="book-card__footer">
            <span
              className={`book-card__status book-card__status--${
                available ? 'available' : 'unavailable'
              }`}
            >
              {available ? 'Доступна' : 'Нет в наличии'}
            </span>
            <span className="book-card__copies">
              {totalAvailable} из {totalCopies}
            </span>
          </div>
        </div>
      </div>

      <Link to={`/books/${book.id}`} className="book-card__action">
        Забронировать
      </Link>
    </article>
  );
};

export default BookCard;