import { useCallback, useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../../components/common/ErrorAlert';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import UsersFilters from '../../components/users/UsersFilters';
import UsersTable from '../../components/users/UsersTable';
import { fetchUsers } from '../../features/users/usersSlice';
import type { UserFilters } from '../../types';

const PAGE_SIZE = 20;

const EMPTY_FILTERS: UserFilters = {
  email: '',
  name: '',
  contactPhone: '',
};

/**
 * Список пользователей для роли manager: только просмотр и фильтры,
 * без действий создания и редактирования.
 */
const ManagerUsersPage = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((state) => state.users);

  const [filters, setFilters] = useState<UserFilters>(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  const load = useCallback(() => {
    // limit на единицу больше нужного: лишний элемент показывает,
    // есть ли следующая страница (API не возвращает общее число записей).
    void dispatch(
      fetchUsers({
        source: 'manager',
        limit: PAGE_SIZE + 1,
        offset,
        ...filters,
      }),
    );
  }, [dispatch, offset, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApplyFilters = (next: UserFilters) => {
    setFilters(next);
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setOffset(0);
  };

  const visibleItems = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  return (
    <>
      <h1 className="manager-users__heading">Пользователи</h1>
      <div className="manager-users__row">
        <div className="manager-users__main-column">
          <Card className="manager-users__card">
            <Card.Body>
              <Card.Title as="h2" className="manager-users__section-title">
                Фильтры
              </Card.Title>
              <UsersFilters
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
            </Card.Body>
          </Card>

          {error && <ErrorAlert message={error} />}

          {loading ? (
            <Loader text="Загрузка пользователей…" />
          ) : (
            <>
              <UsersTable items={visibleItems} />
              <Pagination
                offset={offset}
                limit={PAGE_SIZE}
                hasNext={hasNext}
                onChange={setOffset}
              />
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ManagerUsersPage;
