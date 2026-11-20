import { useState, type FormEvent } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import type { Library, RentalStatus, UserListItem } from '../../types';
import {
  RENTAL_STATUS_LABELS,
  RENTAL_STATUSES,
  type ManagerRentalsFilters,
} from '../../utils/rentals';

interface RentalsFiltersProps {
  /** Пользователи для выпадающего списка (GET /manager/users). */
  users: UserListItem[];
  /** Библиотеки для выпадающего списка (GET /common/libraries). */
  libraries: Library[];
  usersLoading: boolean;
  librariesLoading: boolean;
  onApply: (filters: ManagerRentalsFilters) => void;
  onReset: () => void;
}

/**
 * Фильтры списка аренд менеджера (спецификация, раздел 6.4):
 * пользователь, библиотека и статус — точное совпадение по id/статусу.
 */
const RentalsFilters = ({
  users,
  libraries,
  usersLoading,
  librariesLoading,
  onApply,
  onReset,
}: RentalsFiltersProps) => {
  const [userId, setUserId] = useState('');
  const [libraryId, setLibraryId] = useState('');
  const [status, setStatus] = useState<'' | RentalStatus>('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({ userId, libraryId, status });
  };

  const handleReset = () => {
    setUserId('');
    setLibraryId('');
    setStatus('');
    onReset();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="rentals-filters__row">
        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-user">Пользователь</Form.Label>
          <Form.Select
            id="filter-user"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={usersLoading && users.length === 0}
          >
            <option value="">
              {usersLoading && users.length === 0
                ? 'Загрузка пользователей…'
                : 'Все пользователи'}
            </option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-library">Библиотека</Form.Label>
          <Form.Select
            id="filter-library"
            value={libraryId}
            onChange={(event) => setLibraryId(event.target.value)}
            disabled={librariesLoading && libraries.length === 0}
          >
            <option value="">
              {librariesLoading && libraries.length === 0
                ? 'Загрузка библиотек…'
                : 'Все библиотеки'}
            </option>
            {libraries.map((library) => (
              <option key={library.id} value={library.id}>
                {library.name}
              </option>
            ))}
          </Form.Select>
        </Col>

        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-status">Статус</Form.Label>
          <Form.Select
            id="filter-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as '' | RentalStatus)
            }
          >
            <option value="">Все статусы</option>
            {RENTAL_STATUSES.map((value) => (
              <option key={value} value={value}>
                {RENTAL_STATUS_LABELS[value]}
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      <div className="rentals-filters__actions">
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

export default RentalsFilters;
