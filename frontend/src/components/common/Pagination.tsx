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
      className="pagination__nav"
      aria-label="Пагинация"
    >
      <span className="pagination__page-text">Страница {page}</span>
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
          className="pagination__button--forward"
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
