import { Button, Card } from 'react-bootstrap';
import type { BookFilters as BookFiltersValue, Library } from '../../types';
import ErrorAlert from '../common/ErrorAlert';
import Loader from '../common/Loader';
import BookFilters from './BookFilters';



interface SearchPanelProps {
  /** Библиотеки для выпадающего фильтра (загружаются из API). */
  libraries: Library[];
  /** Идёт ли загрузка списка библиотек. */
  librariesLoading: boolean;
  /** Ошибка загрузки списка библиотек (показывается с кнопкой повтора). */
  librariesError: string | null;
  /** Повторная загрузка списка библиотек. */
  onRetry: () => void;
  onApply: (filters: BookFiltersValue) => void;
  onReset: () => void;
  /**
   * Начальные значения полей формы. На странице поиска сюда приходят
   * фильтры из query-параметров адреса — форма открывается предзаполненной.
   */
  initialFilters?: BookFiltersValue;
  image: string;
}

/**
 * Карточка блока поиска (макет Figma, frame 1:1616 «search form»):
 * зелёная карточка с формой BookFilters и иллюстрация справа.
 * Используется на главной (HomePage) и на странице результатов
 * поиска (BookSearchPage) — визуально блоки одинаковые.
 */
const SearchPanel = ({
  libraries,
  librariesLoading,
  librariesError,
  onRetry,
  onApply,
  onReset,
  initialFilters,
  image,
}: SearchPanelProps) => (
  <Card className="search-panel">
    <Card.Body className="search-panel__body search-panel__card">
      {librariesError && (
        <>
          <ErrorAlert message={librariesError} />
          <Button
            variant="outline-secondary"
            size="sm"
            className="search-panel__retry"
            onClick={onRetry}
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
          onApply={onApply}
          onReset={onReset}
          initialFilters={initialFilters}
        />
      )}
    </Card.Body>
    <img
      className="search-panel__img"
      src={image}
      alt="Иллюстрация"
    />
  </Card>
);

export default SearchPanel;
