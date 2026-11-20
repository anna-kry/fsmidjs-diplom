import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Form } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../../components/common/ErrorAlert';
import Loader from '../../components/common/Loader';
import Pagination from '../../components/common/Pagination';
import RentalsFilters from '../../components/rentals/RentalsFilters';
import { fetchLibraries } from '../../features/libraries/librariesSlice';
import { fetchUsers } from '../../features/users/usersSlice';
import {
  changeRentalStatus,
  clearRentalActionErrors,
  fetchManagerRentals,
} from '../../features/rentals/rentalsSlice';
import type {
  ChangeableRentalStatus,
  ManagerRentalListParams,
} from '../../api/rentals.api';
import {
  EMPTY_MANAGER_RENTALS_FILTERS,
  RENTAL_STATUS_LABELS,
  RENTAL_STATUS_TRANSITIONS,
  formatRentalDate,
  type ManagerRentalsFilters,
} from '../../utils/rentals';
import type { BookRental } from '../../types';

const PAGE_SIZE = 20;
/** Столько записей хватает для выпадающих списков фильтров (лимит API — 100). */
const FILTER_LIST_LIMIT = 100;

/**
 * Управление арендами для роли manager (спецификация, раздел 6.7):
 * список всех аренд, фильтры (пользователь, библиотека, статус)
 * и смена статуса — только по допустимым переходам (раздел 2, п. 11).
 */
const ManagerRentalsPage = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error, statusLoading, statusError } = useAppSelector(
    (state) => state.rentals,
  );
  const {
    items: users,
    loading: usersLoading,
  } = useAppSelector((state) => state.users);
  const {
    items: libraries,
    loading: librariesLoading,
  } = useAppSelector((state) => state.libraries);

  const [filters, setFilters] = useState<ManagerRentalsFilters>(
    EMPTY_MANAGER_RENTALS_FILTERS,
  );
  const [offset, setOffset] = useState(0);
  /** Выбранный новый статус по каждой строке: id аренды → статус. */
  const [statusDraft, setStatusDraft] = useState<
    Record<number, ChangeableRentalStatus>
  >({});

  // Данные для выпадающих списков фильтров — один раз при открытии страницы.
  useEffect(() => {
    dispatch(clearRentalActionErrors());
    void dispatch(fetchUsers({ source: 'manager', limit: FILTER_LIST_LIMIT, offset: 0 }));
    void dispatch(fetchLibraries({ limit: FILTER_LIST_LIMIT, offset: 0 }));
  }, [dispatch]);

  const load = useCallback(() => {
    const params: ManagerRentalListParams = {
      // limit на единицу больше нужного: лишний элемент показывает,
      // есть ли следующая страница (API не возвращает общее число записей).
      limit: PAGE_SIZE + 1,
      offset,
    };
    if (filters.userId) params.userId = Number(filters.userId);
    if (filters.libraryId) params.libraryId = Number(filters.libraryId);
    if (filters.status) params.status = filters.status;

    void dispatch(fetchManagerRentals(params));
  }, [dispatch, offset, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApplyFilters = (next: ManagerRentalsFilters) => {
    setFilters(next);
    setOffset(0);
  };

  const handleResetFilters = () => {
    setFilters(EMPTY_MANAGER_RENTALS_FILTERS);
    setOffset(0);
  };

  /** Применяет выбранный в строке статус и перечитывает список. */
  const handleChangeStatus = async (rental: BookRental) => {
    const status = statusDraft[rental.id];
    if (!status) return;

    const result = await dispatch(
      changeRentalStatus({ id: rental.id, status }),
    );
    if (changeRentalStatus.fulfilled.match(result)) {
      setStatusDraft((current) => {
        const next = { ...current };
        delete next[rental.id];
        return next;
      });
      load();
    }
  };

  const visibleItems = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  return (
    <>
      <h1 className="manager-rentals__heading">Аренды</h1>
      <div className="manager-rentals__row">
        <div className="manager-rentals__main-column">
          <Card className="manager-rentals__card">
            <Card.Body>
              <Card.Title as="h2" className="manager-rentals__section-title">
                Фильтры
              </Card.Title>
              <RentalsFilters
                users={users}
                libraries={libraries}
                usersLoading={usersLoading}
                librariesLoading={librariesLoading}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
            </Card.Body>
          </Card>

          {error && <ErrorAlert message={error} />}
          {statusError && <ErrorAlert message={statusError} />}

          {loading ? (
            <Loader text="Загрузка аренд…" />
          ) : items.length === 0 ? (
            <p className="manager-rentals__empty">
              Аренды не найдены. Измените фильтры поиска.
            </p>
          ) : (
            <>
              <div className="rentals-table__wrapper">
                <table className="rentals-table">
                  <thead>
                    <tr>
                      <th scope="col">Пользователь</th>
                      <th scope="col">Книга</th>
                      <th scope="col">Библиотека</th>
                      <th scope="col">Начало</th>
                      <th scope="col">Окончание</th>
                      <th scope="col">Статус</th>
                      <th scope="col">Смена статуса</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((rental) => {
                      // Допустимые переходы — ровно те, что принимает backend.
                      const allowed = RENTAL_STATUS_TRANSITIONS[rental.status];

                      return (
                        <tr key={rental.id}>
                          <td>
                            {rental.user ? (
                              <>
                                {rental.user.name}
                                <br />
                                <span className="rentals-table__secondary">
                                  {rental.user.email}
                                </span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>
                            {rental.book ? (
                              <>
                                {rental.book.title}
                                <br />
                                <span className="rentals-table__secondary">
                                  {rental.book.author}
                                </span>
                              </>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td>{rental.library?.name ?? '—'}</td>
                          <td>{formatRentalDate(rental.dateStart)}</td>
                          <td>{formatRentalDate(rental.dateEnd)}</td>
                          <td>
                            <span
                              className={`rentals-table__status rentals-table__status--${rental.status}`}
                            >
                              {RENTAL_STATUS_LABELS[rental.status]}
                            </span>
                          </td>
                          <td>
                            {allowed.length === 0 ? (
                              '—'
                            ) : (
                              <div className="manager-rentals__status-change">
                                <Form.Select
                                  size="sm"
                                  aria-label={`Новый статус для аренды ${rental.id}`}
                                  value={statusDraft[rental.id] ?? ''}
                                  disabled={statusLoading}
                                  onChange={(event) =>
                                    setStatusDraft((current) => ({
                                      ...current,
                                      [rental.id]: event.target
                                        .value as ChangeableRentalStatus,
                                    }))
                                  }
                                >
                                  <option value="">Выберите статус</option>
                                  {allowed.map((value) => (
                                    <option key={value} value={value}>
                                      {RENTAL_STATUS_LABELS[value]}
                                    </option>
                                  ))}
                                </Form.Select>
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="manager-rentals__status-button"
                                  disabled={
                                    statusLoading || !statusDraft[rental.id]
                                  }
                                  onClick={() => void handleChangeStatus(rental)}
                                >
                                  {statusLoading ? 'Сохранение…' : 'Применить'}
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

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

export default ManagerRentalsPage;
