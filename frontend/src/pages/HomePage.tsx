import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import BookSwiper from '../components/books/BookSwiper';
import SearchPanel from '../components/books/SearchPanel';
import Map from '../components/common/Map';
import { fetchLibraries } from '../features/libraries/librariesSlice';
import { buildSearchQuery } from '../utils/searchQuery';
import type { BookFilters as BookFiltersValue } from '../types';

/** Библиотек для фильтра немного — забираем одним запросом. */
const LIBRARIES_LIMIT = 100;

/**
 * Публичная главная страница: блок поиска, раздел «О нас»,
 * блоки «Выбор редакции» и карта библиотек.
 *
 * Поиск книг выполняется не здесь, а на отдельной странице /search:
 * по кнопке «Найти» происходит редирект с фильтрами в query-параметрах,
 * там же показываются результаты (см. BookSearchPage).
 */
const HomePage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const {
    items: libraries,
    loading: librariesLoading,
    error: librariesError,
  } = useAppSelector((state) => state.libraries);

  const loadLibraries = useCallback(() => {
    // Список библиотек для фильтра — загружаем один раз на старте.
    void dispatch(fetchLibraries({ limit: LIBRARIES_LIMIT, offset: 0 }));
  }, [dispatch]);

  // Загружаем библиотеки для фильтра при монтировании.
  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  // Кнопка «Найти»: редирект на страницу поиска с фильтрами в адресе.
  const handleApply = (filters: BookFiltersValue) => {
    const query = buildSearchQuery(filters);
    navigate(query ? `/search?${query}` : '/search');
  };

  // Сброс на главной — просто очищает поля формы (сама форма это делает),
  // результаты здесь не показываются, так что перейти некуда.
  const handleReset = () => {
    // Ничего не делаем: BookFilters уже очистил свои поля.
  };

  return (
    <>
      <SearchPanel
        libraries={libraries}
        librariesLoading={librariesLoading}
        librariesError={librariesError}
        onRetry={loadLibraries}
        onApply={handleApply}
        onReset={handleReset}
      />

      {/* Первый экземпляр свайпера — под поиском */}
      <BookSwiper title="Выбор редакции" />

      {/* Раздел «О нас» */}
      <section className="homepage__about" id="about">
        <h2 className="homepage__about-title">О нас</h2>
        <p className="homepage__about-text">
          Наш сервис — это единый портал, соединяющий все крупнейшие и малые
          библиотеки Москвы. Здесь работают лучшие библиотекари, краеведы и
          историки города, бережно собирающие и описывающие книжные сокровища
          столицы. Через наш агрегатор вы сможете быстро найти любую книгу —
          от редких дореволюционных изданий до новинок современной литературы.
        </p>
        <p className="homepage__about-text">
          Достаточно ввести название или автора и система покажет, в каких
          библиотеках есть нужный экземпляр. Вы можете выбрать удобный филиал,
          забронировать книгу онлайн и забрать её в назначенное время.
        </p>
        <p className="homepage__about-text">
          Сервис охватывает все округа Москвы, так что любимые книги всегда
          окажутся рядом.
        </p>
      </section>

      {/* Второй экземпляр свайпера — после «О нас» */}
      <BookSwiper title="Выбор редакции" />

      {/* Карта библиотек */}
      <Map />
    </>
  );
};

export default HomePage;
