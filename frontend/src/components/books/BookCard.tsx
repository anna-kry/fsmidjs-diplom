import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Book } from '../../types';

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
  const available = book.availableCopies > 0;

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
              <span className="book-card__label">Библиотека:</span>
              <span className="book-card__value">
                {book.library ? book.library.name : 'Библиотека не указана'}
              </span>
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
              {book.availableCopies} из {book.totalCopies}
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
