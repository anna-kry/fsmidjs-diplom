import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import SearchPanel from '../components/books/SearchPanel';
import BookCard from '../components/books/BookCard';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import { searchBooks } from '../features/books/booksSlice';
import { fetchLibraries } from '../features/libraries/librariesSlice';
import { buildSearchQuery, parseSearchQuery } from '../utils/searchQuery';
import type { BookFilters as BookFiltersValue } from '../types';

const PAGE_SIZE = 12;
/** Библиотек для фильтра немного — забираем одним запросом. */
const LIBRARIES_LIMIT = 100;

/**
 * Склонение слова «книга» для заголовка «Найдено: N …»:
 * 1 книга, 2-4 книги, 5+ книг (и 11-14 книг).
 */
const pluralizeBooks = (count: number): string => {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  if (lastTwo > 10 && lastTwo < 20) return 'книг';
  if (last > 1 && last < 5) return 'книги';
  if (last === 1) return 'книга';
  return 'книг';
};

/**
 * Страница результатов поиска (макеты Figma 1:2441 и 1:2899):
 * та же форма поиска, что и на главной, но предзаполненная фильтрами
 * из query-параметров адреса, и под ней блок с результатами.
 *
 * Фильтры живут в адресе (/search?title=…&author=…): их видно в адресной
 * строке, работают после F5 и при переходе по ссылке. Смена параметров
 * или пагинации запускает поиск автоматически.
 */
const BookSearchPage = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  const { items, total, loading, error } = useAppSelector(
    (state) => state.books,
  );
  const {
    items: libraries,
    loading: librariesLoading,
    error: librariesError,
  } = useAppSelector((state) => state.libraries);

  /** Текущая страница результатов (сбрасывается при новом поиске). */
  const [offset, setOffset] = useState(0);

  // Фильтры = query-параметры адреса; пересоздаются только при их смене.
  const filters = useMemo(
    () => parseSearchQuery(location.search),
    [location.search],
  );

  const loadLibraries = useCallback(() => {
    void dispatch(fetchLibraries({ limit: LIBRARIES_LIMIT, offset: 0 }));
  }, [dispatch]);

  // Список библиотек для фильтра — один раз при открытии страницы.
  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  // Поиск: при открытии страницы, смене фильтров в адресе и пагинации.
  const runSearch = useCallback(() => {
    // limit на единицу больше нужного: лишний элемент показывает,
    // есть ли следующая страница (API не возвращает общее число записей).
    void dispatch(
      searchBooks({ limit: PAGE_SIZE + 1, offset, ...filters }),
    );
  }, [dispatch, offset, filters]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  // Кнопка «Найти»: пишет фильтры в адрес (поиск запустится сам).
  const handleApply = (next: BookFiltersValue) => {
    setOffset(0); // новый поиск — всегда первая страница
    navigate({ search: buildSearchQuery(next) });
  };

  // Сброс: очищает форму и адрес — покажется весь каталог.
  const handleReset = () => {
    setOffset(0);
    navigate({ search: '' });
  };

  // Повтор после ошибки поиска.
  const handleRetry = () => {
    runSearch();
  };

  // Отображаем ровно страницу, а не запасной элемент из limit + 1.
  const visibleBooks = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  return (
    <>
      {/* key пересоздаёт форму при смене адреса: поля синхронизируются
          с URL, в том числе при возврате кнопкой «Назад» браузера. */}
      <SearchPanel
        key={location.search}
        libraries={libraries}
        librariesLoading={librariesLoading}
        librariesError={librariesError}
        onRetry={loadLibraries}
        onApply={handleApply}
        onReset={handleReset}
        initialFilters={filters}
      />

      {loading ? (
        <Loader text="Загрузка книг…" />
      ) : error ? (
        <>
          <ErrorAlert message={error} />
          <Button
            variant="outline-secondary"
            size="sm"
            className="search-page__retry"
            onClick={handleRetry}
          >
            Повторить
          </Button>
        </>
      ) : total === 0 ? (
        /* Пустая выдача (макет Figma 1:2899). */
        <section className="search-page__empty">
          <h1 className="search-page__empty-title">
            По вашему запросу ничего не найдено
          </h1>
          <p className="search-page__empty-text">
            К сожалению, по указанным данным книга не найдена. Проверьте
            правильность написания или попробуйте изменить параметры поиска
            (автор, название, дата).
          </p>
        </section>
      ) : (
        /* Результаты поиска (макет Figma 1:2441). */
        <>
          <h1 className="search-page__found">
            Найдено: {total} {pluralizeBooks(total)}
          </h1>
          <div className="search-page__grid">
            {visibleBooks.map((book) => (
              <div key={book.id} className="search-page__book-cell">
                <BookCard book={book} />
              </div>
            ))}
          </div>
          <Pagination
            offset={offset}
            limit={PAGE_SIZE}
            hasNext={hasNext}
            onChange={setOffset}
          />
        </>
      )}
    </>
  );
};

export default BookSearchPage;
