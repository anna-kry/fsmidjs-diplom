import { useState, type FormEvent } from 'react';
import { Button, Form } from 'react-bootstrap';
import type { BookFilters as BookFiltersValue, Library } from '../../types';

interface BookFiltersProps {
  /** Список библиотек для выпадающего фильтра (загружается из API). */
  libraries: Library[];
  onApply: (filters: BookFiltersValue) => void;
  onReset: () => void;
  /** Скрыть поле выбора библиотеки (используется на странице книг одной библиотеки). */
  hideLibraryFilter?: boolean;
  /**
   * Начальные значения полей — для предзаполнения формы (страница поиска
   * подставляет сюда фильтры из query-параметров адреса).
   */
  initialFilters?: BookFiltersValue;
}

/**
 * Блок поиска книг по макету Figma (frame 1:1616 «search form»):
 * подписи над полями ввода (16px, отступ 8px), поля высотой 51px,
 * между группами полей 40px, кнопки по центру карточки.
 *
 * Сетка реализована собственным классом `book-filters__row`, без Row/Col
 * из Bootstrap: те задают width/padding и отрицательные поля, которые
 * конфликтуют с CSS Grid (у грид-элемента containing block — его grid-area).
 */
const BookFilters = ({
  libraries,
  onApply,
  onReset,
  hideLibraryFilter = false,
  initialFilters,
}: BookFiltersProps) => {
  const [library, setLibrary] = useState(initialFilters?.library ?? '');
  const [author, setAuthor] = useState(initialFilters?.author ?? '');
  const [title, setTitle] = useState(initialFilters?.title ?? '');
  const [availableOnly, setAvailableOnly] = useState(
    initialFilters?.availableOnly ?? false,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({
      library: hideLibraryFilter ? '' : library,
      author: author.trim(),
      title: title.trim(),
      availableOnly,
    });
  };

  const handleReset = () => {
    setLibrary('');
    setAuthor('');
    setTitle('');
    setAvailableOnly(false);
    onReset();
  };

  return (
    <Form onSubmit={handleSubmit} className="book-filters__form">
      <div className="">
        {!hideLibraryFilter && (
          <div className="book-filters__field">
            <Form.Label htmlFor="filter-library" className="book-filters__label">
              Библиотека
            </Form.Label>
            <Form.Select
              id="filter-library"
              className="book-filters__select"
              value={library}
              onChange={(event) => setLibrary(event.target.value)}
            >
              <option value="">Все библиотеки</option>
              {libraries.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </Form.Select>
          </div>
        )}
        <div className="book-filters__field">
          <Form.Label htmlFor="filter-author" className="book-filters__label">
            Автор
          </Form.Label>
          <Form.Control
            id="filter-author"
            className="book-filters__input"
            type="search"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Часть имени автора"
          />
        </div>

        <div className="book-filters__field">
          <Form.Label htmlFor="filter-title" className="book-filters__label">
            Название
          </Form.Label>
          <Form.Control
            id="filter-title"
            className="book-filters__input"
            type="search"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Часть названия"
          />
        </div>

        <div className="book-filters__field book-filters__field--checkbox">
          <Form.Check
            id="filter-available"
            type="checkbox"
            className="book-filters__checkbox"
            label="Только доступные"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />
        </div>
      </div>

      <div className="book-filters__actions">
        <Button type="submit" variant="primary" className="book-filters__button">
          Найти
        </Button>
        <Button
          type="button"
          variant="outline-secondary"
          className="book-filters__button book-filters__button--secondary"
          onClick={handleReset}
        >
          Сбросить
        </Button>
      </div>
    </Form>
  );
};

export default BookFilters;
