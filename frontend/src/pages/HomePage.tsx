import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import BookCard from '../components/books/BookCard';
import BookFilters from '../components/books/BookFilters';
import BookSwiper from '../components/books/BookSwiper';
import Map from '../components/common/Map';
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

/**
 * Публичная главная страница: поиск книг, блок «Новые поступления»,
 * раздел «О нас» и блок «Выбор редакции».
 * Список книг показывается только после выполнения поиска.
 */
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
  /** Флаг: был ли произведён хотя бы один поиск. */
  const [searched, setSearched] = useState(false);

  const loadLibraries = useCallback(() => {
    // Список библиотек для фильтра — загружаем один раз на старте.
    void dispatch(fetchLibraries({ limit: LIBRARIES_LIMIT, offset: 0 }));
  }, [dispatch]);

  // Загружаем библиотеки для фильтра при монтировании.
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

  const handleApplyFilters = (next: BookFiltersValue) => {
    // Новые фильтры — всегда первая страница.
    setFilters(next);
    setOffset(0);
    setSearched(true);
    load();
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
    setSearched(false);
  };

  // Отображаем ровно страницу, а не запасной элемент из limit + 1.
  const visibleBooks = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  // Книги показываем только после того, как пользователь выполнил поиск.
  const showBooks = searched;

  return (
    <>
      <h1 className="homepage__heading">Поиск книг</h1>

      {/* Блок поиска (стили по макету Figma) */}
      <Card className="homepage__search-card">
        <Card.Body className="homepage__search-body">
          {librariesError && (
            <>
              <ErrorAlert message={librariesError} />
              <Button
                variant="outline-secondary"
                size="sm"
                className="homepage__retry-button"
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
            className="homepage__retry-button"
            onClick={() => {
              setSearched(true);
              load();
            }}
          >
            Повторить
          </Button>
        </>
      )}

      {/* Первый экземпляр свайпера — под поиском */}
      <BookSwiper title="Новые поступления" />

      {/* Раздел «О нас» */}
      <section className="homepage__about" id="about">
        <h2 className="homepage__about-title">О нас</h2>
        <p className="homepage__about-text">
          Наш сервис — это единый портал, соединяющий все крупнейшие и малые
          библиотеки Москвы. Здесь работают лучшие библиотекари, краеведы и
          историки города, бережно собирающие и описывающие книжные сокровища
          столицы. Через наш агрегатор вы сможете быстро найти любую книгу —
          от редких дореволюционных изданий до новинок современной литературы.
          Достаточно ввести название или автора и система покажет, в каких
          библиотеках есть нужный экземпляр. Вы можете выбрать удобный филиал,
          забронировать книгу онлайн и забрать её в назначенное время.
          Сервис охватывает все округа Москвы, так что любимые книги всегда
          окажутся рядом.
        </p>
      </section>

      {/* Карта библиотек */}
      <Map />

      {/* Второй экземпляр свайпера — после «О нас» */}
      <BookSwiper title="Выбор редакции" />

      {/* Блок с результатами поиска — только после выполнения поиска */}
      {showBooks && (
        <>
          {loading ? (
            <Loader text="Загрузка книг…" />
          ) : (
            !error && (
              <>
                {visibleBooks.length === 0 ? (
                  <div className="homepage__empty-state">
                    <p className="homepage__empty-message">
                      По вашему запросу ничего не найдено.
                    </p>
                    <Button variant="outline-secondary" onClick={handleResetFilters}>
                      Сбросить фильтры
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="homepage__books-grid">
                      {visibleBooks.map((book) => (
                        <div
                          key={book.id}
                          className="homepage__book-cell"
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
        </>
      )}
    </>
  );
};

export default HomePage;
