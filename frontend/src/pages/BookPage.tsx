import { useCallback, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import RentalForm from '../components/books/RentalForm';
import { fetchBook } from '../features/books/booksSlice';
import type { Book } from '../types';

/** Страница деталей книги: /books/:id. */
const BookPage = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { items: books, loading, error } = useAppSelector((state) => state.books);
  const user = useAppSelector((state) => state.auth.user);

  const bookId = id ? Number(id) : NaN;
  const book = books.find((item: Book) => item.id === bookId);

  const loadBook = useCallback(() => {
    if (Number.isNaN(bookId)) return;
    void dispatch(fetchBook(bookId));
  }, [dispatch, bookId]);

  useEffect(() => {
    loadBook();
  }, [loadBook]);

  const notFound = !loading && !error && !book;

  return (
    <>
      {loading && !book ? (
        <Loader text="Загрузка книги…" fullPage />
      ) : notFound ? (
        <div className="book-page__not-found">
          <h1 className="book-page__heading">Книга не найдена</h1>
          <p className="book-page__message">
            Книга с указанным идентификатором не существует или была удалена.
          </p>
        </div>
      ) : error && !book ? (
        <div className="book-page__error">
          <ErrorAlert message={error ?? 'Не удалось загрузить книгу'} />
        </div>
      ) : (
        <div className="book-page">
          {book && (
            <>
              <div className="book-page__header">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={`Обложка книги «${book.title}»`}
                    className="book-page__cover"
                  />
                ) : (
                  <div className="book-page__cover-placeholder">
                    Нет обложки
                  </div>
                )}
                <div className="book-page__info">
                  <h1 className="book-page__title">{book.title}</h1>
                  <div className="book-page__meta">
                    <div className="book-page__row">
                      <span className="book-page__label">Автор:</span>
                      <span className="book-page__value">{book.author}</span>
                    </div>
                    {book.year != null && (
                      <div className="book-page__row">
                        <span className="book-page__label">Год:</span>
                        <span className="book-page__value">{book.year}</span>
                      </div>
                    )}
                    {book.description && (
                      <div className="book-page__row book-page__description">
                        <span className="book-page__label">Описание:</span>
                        <span className="book-page__value">{book.description}</span>
                      </div>
                    )}
                    <div className="book-page__row">
                      <span className="book-page__label">Библиотека:</span>
                      <span className="book-page__value">
                        {book.library?.name || 'Библиотека не указана'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="book-page__details">
                <div className="book-page__row">
                  <span className="book-page__label">Доступность:</span>
                  <span
                    className={`book-page__status ${
                      book.availableCopies > 0 ? 'book-page__status--available' : 'book-page__status--unavailable'
                    }`}
                  >
                    {book.availableCopies > 0 ? 'Доступна' : 'Нет в наличии'}
                  </span>
                </div>
                <div className="book-page__row">
                  <span className="book-page__label">Экземпляры:</span>
                  <span className="book-page__value">
                    {book.availableCopies} из {book.totalCopies}
                  </span>
                </div>
              </div>

              {/* Бронирование: форма у клиента, подсказка о входе у гостя.
                  Админ и менеджер бронировать не могут — им форма не нужна. */}
              {!user && (
                <div className="book-page__booking-hint">
                  <p className="book-page__message">
                    Войдите, чтобы забронировать книгу.
                  </p>
                  <Link to="/login" className="btn btn-primary">
                    Войти
                  </Link>
                </div>
              )}
              {user?.role === 'client' &&
                (book.library ? (
                  <RentalForm book={book} />
                ) : (
                  <div className="book-page__booking-hint">
                    <p className="book-page__message">
                      У книги не указана библиотека — бронирование недоступно.
                    </p>
                  </div>
                ))}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default BookPage;
