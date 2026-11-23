import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';
import { getApiErrorMessage } from '../../api/error';
import { booksApi } from '../../api/books.api';
import type { Book } from '../../types';
import ErrorAlert from '../common/ErrorAlert';
import Loader from '../common/Loader';
import BookCard from './BookCard';

interface BookSwiperProps {
  /**
   * id книг в слайдерах: порядок массива = порядок слайдов.
   * Если не указан — показываются случайные `randomCount` книг каталога.
   * Несуществующие/удалённые id просто пропускаются.
   */
  bookIds?: number[];
  /** Заголовок блока (по умолчанию — «Случайные книги» или «Подборка книг»). */
  title?: string;
  /** Сколько случайных книг показать, если `bookIds` не задан (по умолчанию 5). */
  randomCount?: number;
  /** Автопрокрутка слайдов (по умолчанию выключена). */
  autoplay?: boolean;
}

/** API отдаёт максимум 100 записей за запрос — случайно выбираем из этой выборки. */
const CANDIDATES_LIMIT = 100;
const DEFAULT_RANDOM_COUNT = 5;

/** Перемешивает массив (Fisher–Yates) и возвращает его же. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Загружает книги: либо по списку id (порядок сохраняется),
 * либо случайную выборку из каталога.
 */
async function loadBooks(idsKey: string, randomCount: number): Promise<Book[]> {
  if (idsKey) {
    const ids = idsKey.split(',').map(Number);
    const results = await Promise.all(ids.map((id) => booksApi.fetchBook(id).catch(() => null)));
    const found = results.filter((book): book is Book => book !== null);

    if (found.length === 0) {
      // Ни одна книга по указанным id не найдена — ошибка с кнопкой повтора.
      throw new Error('no-books-by-ids');
    }
    return found;
  }

  const { items: candidates } = await booksApi.searchBooks({
    limit: CANDIDATES_LIMIT,
    offset: 0,
  });
  return shuffle(candidates).slice(0, randomCount);
}

/**
 * Слайдер книг на главной (Swiper).
 *
 * Настраивается пропсами см. `BookSwiperProps`; сами опции Swiper
 * (`navigation`, `pagination`, `breakpoints`, `autoplay`) заданы
 * в JSX ниже — там же комментарии, что и как менять.
 */
/** Результат последней загрузки: ключ запроса + данные или ошибка. */
interface SliderState {
  /** Ключ завершённого запроса; null — ещё ничего не загружали. */
  key: string | null;
  books: Book[];
  error: string | null;
}

const BookSwiper = ({
  bookIds,
  title,
  randomCount = DEFAULT_RANDOM_COUNT,
  autoplay = false,
}: BookSwiperProps) => {
  const [state, setState] = useState<SliderState>({
    key: null,
    books: [],
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  // Стабильный ключ для useEffect: литерал `bookIds={[1, 2]}` создаёт новый
  // массив при каждом рендере родителя, а зависимость от строки не вызовет
  // лишних перезапросов.
  const idsKey = bookIds?.join(',') ?? '';
  const requestKey = `${idsKey}|${randomCount}|${reloadKey}`;

  // Загрузка «в процессе», пока состояние не соответствует текущему запросу:
  // так не нужен setState в effect (правило react-hooks/set-state-in-effect).
  const loading = state.key !== requestKey;

  useEffect(() => {
    let cancelled = false;

    loadBooks(idsKey, randomCount)
      .then((list) => {
        if (!cancelled) {
          setState({ key: requestKey, books: list, error: null });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            key: requestKey,
            books: [],
            error: getApiErrorMessage(err, 'Не удалось загрузить книги для слайдера.'),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey, randomCount, requestKey]);

  const handleRetry = () => {
    setReloadKey((key) => key + 1);
  };

  // Состояния loading / error / empty.
  if (loading) {
    return (
      <section className="book-swiper">
        <Loader text="Загрузка книг…" />
      </section>
    );
  }

  if (state.error) {
    return (
      <section className="book-swiper">
        <ErrorAlert message={state.error} />
        <Button variant="outline-secondary" size="sm" onClick={handleRetry}>
          Повторить
        </Button>
      </section>
    );
  }

  // Пустой каталог или все id не найдены — блок просто не показываем.
  if (state.books.length === 0) {
    return null;
  }

  const blockTitle = title ?? (bookIds?.length ? 'Подборка книг' : 'Случайные книги');

  return (
    <section className="book-swiper">
      <h2 className="book-swiper__title">{blockTitle}</h2>

      <Swiper
        className="book-swiper__slider"
        // Подключённые модули: стрелки, точки, управление с клавиатуры,
        // автопрокрутка (используется, только если autoplay=true).
        modules={[Navigation, Pagination, Keyboard, Autoplay]}
        navigation
        pagination={{ clickable: true }}
        keyboard
        autoplay={autoplay ? { delay: 3500, disableOnInteraction: false } : false}
        // Раскладка: 1 слайд на телефоне, 2 на планшете, 3 на ноутбуке, 4 на
        // широком экране; отступ между карточками — 16px.
        spaceBetween={16}
        slidesPerView={2.5}
        breakpoints={{
          576: { slidesPerView: 1 },
          992: { slidesPerView: 2 },
          1400: { slidesPerView: 2.5 },
        }}
      >
        {state.books.map((book) => (
          <SwiperSlide key={book.id}>
            <BookCard book={book} variant="slider" />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default BookSwiper;
