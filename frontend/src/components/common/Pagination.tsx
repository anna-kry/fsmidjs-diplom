import { Button } from 'react-bootstrap';

interface PaginationProps {
  offset: number;
  limit: number;
  hasNext: boolean;
  onChange: (offset: number) => void;
}

/**
 * Пагинация «Назад/Вперёд». API возвращает только массив без общего
 * числа записей, поэтому номер страницы вычисляется из offset.
 */
const Pagination = ({ offset, limit, hasNext, onChange }: PaginationProps) => {
  const page = Math.floor(offset / limit) + 1;

  return (
    <nav
      className="d-flex justify-content-between align-items-center mt-3"
      aria-label="Пагинация"
    >
      <span className="text-body-secondary">Страница {page}</span>
      <div>
        <Button
          variant="outline-secondary"
          size="sm"
          disabled={offset === 0}
          onClick={() => onChange(offset - limit)}
        >
          Назад
        </Button>
        <Button
          variant="outline-secondary"
          size="sm"
          className="ms-2"
          disabled={!hasNext}
          onClick={() => onChange(offset + limit)}
        >
          Вперёд
        </Button>
      </div>
    </nav>
  );
};

export default Pagination;
