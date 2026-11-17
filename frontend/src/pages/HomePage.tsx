import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import BookCard from '../components/books/BookCard';
import BookFilters from '../components/books/BookFilters';
import { searchBooks } from '../features/books/booksSlice';
import { fetchLibraries } from '../features/libraries/librariesSlice';
import type { BookFilters as BookFiltersValue } from '../types';

const PAGE_SIZE = 12;
/** Библиотек для фильтра немного — забираем одним запросом. */
const LIBRARIES_LIMIT = 100;

const EMPTY_FILTERS: BookFiltersValue = {
  library: '',
  author: '',
  title: '',
  availableOnly: false,
};

/** Публичная главная страница: поиск книг с фильтрами и пагинацией. */
const HomePage = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.books);
  const {
    items: libraries,
    loading: librariesLoading,
    error: librariesError,
  } = useAppSelector((state) => state.libraries);

  const [filters, setFilters] = useState<BookFiltersValue>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  const loadLibraries = useCallback(() => {
    // Список библиотек для фильтра — загружаем один раз на старте.
    void dispatch(fetchLibraries({ limit: LIBRARIES_LIMIT, offset: 0 }));
  }, [dispatch]);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const load = useCallback(() => {
    // limit на единицу больше нужного: лишний элемент показывает,
    // есть ли следующая страница (API не возвращает общее число записей).
    void dispatch(
      searchBooks({ limit: PAGE_SIZE + 1, offset, ...filters }),
    );
  }, [dispatch, offset, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApplyFilters = (next: BookFiltersValue) => {
    // Новые фильтры — всегда первая страница.
    setFilters(next);
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
  };

  // Отображаем ровно страницу, а не запасной элемент из limit + 1.
  const visibleBooks = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  return (
    <>
      <h1 className="mb-4">Поиск книг</h1>
      <div className="row">
        <div className="col-12 col-xl-10 col-xxl-9">
          <Card className="mb-4">
            <Card.Body>
              <Card.Title as="h2" className="h5">
                Фильтры
              </Card.Title>
              {librariesError && (
                <>
                  <ErrorAlert message={librariesError} />
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="mb-3"
                    onClick={loadLibraries}
                  >
                    Повторить
                  </Button>
                </>
              )}
              {librariesLoading ? (
                <Loader text="Загрузка библиотек…" />
              ) : (
                <BookFilters
                  libraries={libraries}
                  onApply={handleApplyFilters}
                  onReset={handleResetFilters}
                />
              )}
            </Card.Body>
          </Card>

          {error && (
            <>
              <ErrorAlert message={error} />
              <Button
                variant="outline-secondary"
                size="sm"
                className="mb-3"
                onClick={load}
              >
                Повторить
              </Button>
            </>
          )}

          {loading ? (
            <Loader text="Загрузка книг…" />
          ) : (
            !error && (
              <>
                {visibleBooks.length === 0 ? (
                  <div className="text-center py-5">
                    <p className="mb-3">
                      По вашему запросу ничего не найдено.
                    </p>
                    <Button variant="outline-secondary" onClick={handleResetFilters}>
                      Сбросить фильтры
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="row g-3">
                      {visibleBooks.map((book) => (
                        <div
                          key={book.id}
                          className="col-12 col-sm-6 col-lg-4 col-xl-3"
                        >
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
            )
          )}
        </div>
      </div>
    </>
  );
};

export default HomePage;
