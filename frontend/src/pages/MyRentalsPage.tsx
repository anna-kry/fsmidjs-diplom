import { useCallback, useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ConfirmModal from '../components/common/ConfirmModal';
import ErrorAlert from '../components/common/ErrorAlert';
import Loader from '../components/common/Loader';
import Pagination from '../components/common/Pagination';
import {
  cancelRental,
  clearRentalActionErrors,
  fetchMyRentals,
} from '../features/rentals/rentalsSlice';
import {
  RENTAL_STATUS_LABELS,
  formatRentalDate,
} from '../utils/rentals';
import type { BookRental } from '../types';

const PAGE_SIZE = 20;

/**
 * «Мои брони» (спецификация, раздел 6.4): список своих аренд со статусом
 * и отменой брони в статусе `reserved` — с подтверждением.
 */
const MyRentalsPage = () => {
  const dispatch = useAppDispatch();
  const { items, loading, error, cancelLoading, cancelError } = useAppSelector(
    (state) => state.rentals,
  );

  const [offset, setOffset] = useState(0);
  /** Бронь, которую пользователь собирается отменить (открыто подтверждение). */
  const [pendingCancel, setPendingCancel] = useState<BookRental | null>(null);

  const load = useCallback(() => {
    // limit на единицу больше нужного: лишний элемент показывает,
    // есть ли следующая страница (API не возвращает общее число записей).
    void dispatch(fetchMyRentals({ limit: PAGE_SIZE + 1, offset }));
  }, [dispatch, offset]);

  useEffect(() => {
    // Ошибки прошлого визита не должны висеть на странице.
    dispatch(clearRentalActionErrors());
    load();
  }, [load, dispatch]);

  const handleCancel = async () => {
    if (!pendingCancel) return;
    const result = await dispatch(cancelRental(pendingCancel.id));
    setPendingCancel(null);
    // После отмены перечитываем список с сервера.
    if (cancelRental.fulfilled.match(result)) {
      load();
    }
  };

  const visibleItems = items.slice(0, PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;

  return (
    <>
      <h1 className="my-rentals__heading">Мои брони</h1>

      {error && <ErrorAlert message={error} />}
      {cancelError && <ErrorAlert message={cancelError} />}

      {loading ? (
        <Loader text="Загрузка броней…" />
      ) : items.length === 0 ? (
        <div className="my-rentals__empty">
          <p className="my-rentals__empty-message">
            У вас пока нет броней. Найдите книгу и забронируйте её на нужные
            даты.
          </p>
          <Link to="/search" className="btn btn-primary">
            Найти книгу
          </Link>
        </div>
      ) : (
        <>
          <div className="rentals-table__wrapper">
            <table className="rentals-table">
              <thead>
                <tr>
                  <th scope="col">Книга</th>
                  <th scope="col">Библиотека</th>
                  <th scope="col">Начало</th>
                  <th scope="col">Окончание</th>
                  <th scope="col">Статус</th>
                  <th scope="col">Действие</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((rental) => (
                  <tr key={rental.id}>
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
                      {/* Отменить можно только бронь в статусе reserved
                          (спецификация, раздел 2, п. 11). */}
                      {rental.status === 'reserved' ? (
                        <Button
                          variant="outline-danger"
                          size="sm"
                          disabled={cancelLoading}
                          onClick={() => setPendingCancel(rental)}
                        >
                          Отменить
                        </Button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
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

      <ConfirmModal
        show={pendingCancel !== null}
        onHide={() => setPendingCancel(null)}
        onConfirm={() => void handleCancel()}
        title="Отмена брони"
        message={
          pendingCancel
            ? `Отменить бронь «${pendingCancel.book?.title ?? 'книга'}» на даты с ${formatRentalDate(pendingCancel.dateStart)} по ${formatRentalDate(pendingCancel.dateEnd)}?`
            : ''
        }
        confirmLabel="Отменить бронь"
        loadingLabel="Отмена…"
        loading={cancelLoading}
      />
    </>
  );
};

export default MyRentalsPage;
