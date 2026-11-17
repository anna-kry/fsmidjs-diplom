import { useState, type FormEvent } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import type { BookFilters as BookFiltersValue, Library } from '../../types';

interface BookFiltersProps {
  /** Список библиотек для выпадающего фильтра (загружается из API). */
  libraries: Library[];
  onApply: (filters: BookFiltersValue) => void;
  onReset: () => void;
}

/**
 * Фильтры поиска: библиотека, автор, название, «Только доступные».
 * Поля отправляются по нажатию «Найти»; сброс очищает все поля.
 */
const BookFilters = ({ libraries, onApply, onReset }: BookFiltersProps) => {
  const [library, setLibrary] = useState('');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({
      library,
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
    <Form onSubmit={handleSubmit}>
      <Row className="g-3">
        <Col xs={12} md={6} xl={3}>
          <Form.Label htmlFor="filter-library">Библиотека</Form.Label>
          <Form.Select
            id="filter-library"
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
        </Col>
        <Col xs={12} md={6} xl={3}>
          <Form.Label htmlFor="filter-author">Автор</Form.Label>
          <Form.Control
            id="filter-author"
            type="search"
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            placeholder="Часть имени автора"
          />
        </Col>
        <Col xs={12} md={6} xl={3}>
          <Form.Label htmlFor="filter-title">Название</Form.Label>
          <Form.Control
            id="filter-title"
            type="search"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Часть названия"
          />
        </Col>
        <Col xs={12} md={6} xl={3} className="d-flex align-items-end">
          <Form.Check
            id="filter-available"
            type="checkbox"
            label="Только доступные"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />
        </Col>
      </Row>
      <div className="d-flex gap-2 mt-3">
        <Button type="submit" variant="primary">
          Найти
        </Button>
        <Button type="button" variant="outline-secondary" onClick={handleReset}>
          Сбросить
        </Button>
      </div>
    </Form>
  );
};

export default BookFilters;
