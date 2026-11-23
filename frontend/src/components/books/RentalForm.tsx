import { useEffect, useState, type FormEvent } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  clearRentalActionErrors,
  createRental,
} from '../../features/rentals/rentalsSlice';
import { todayString, validateRentalDates } from '../../utils/rentals';
import type { Book, BookLibrary } from '../../types';
import ErrorAlert from '../common/ErrorAlert';

interface RentalFormProps {
  /** Бронируемая книга: из неё берём bookId. */
  book: Book;
  /** Библиотека, в которой делается бронь. */
  library: BookLibrary | null;
}

const RentalForm = ({ book, library }: RentalFormProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { createLoading, createError } = useAppSelector(
    (state) => state.rentals,
  );

  // Даты по умолчанию: начало — сегодня, конец — то же (пользователь правит).
  const [dateStart, setDateStart] = useState(todayString());
  const [dateEnd, setDateEnd] = useState(todayString());
  const [validationError, setValidationError] = useState<string | null>(null);

  const libraryId = library?.id;

  // Ошибка прошлой попытки бронирования не должна висеть на новой странице.
  useEffect(() => {
    dispatch(clearRentalActionErrors());
  }, [dispatch]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createLoading) return; // защита от повторного нажатия

    const dateError = validateRentalDates(dateStart, dateEnd);
    setValidationError(dateError);
    if (dateError || libraryId === undefined) return;

    // Ошибка сервера уже лежит в createError и показывается ниже.
    const result = await dispatch(
      createRental({
        bookId: book.id,
        libraryId,
        dateStart,
        dateEnd,
      }),
    );

    if (createRental.fulfilled.match(result)) {
      navigate('/user/rentals');
    }
  };

  return (
    <section className="rental-form" aria-labelledby="rental-form-title">
      <h2 id="rental-form-title" className="rental-form__title">
        Забронировать книгу
      </h2>

      {createError && <ErrorAlert message={createError} />}

      <Form onSubmit={handleSubmit} noValidate>
        <div className="rental-form__fields">
          <Form.Group controlId="rental-date-start">
            <Form.Label className="rental-form__label">
              Дата начала аренды
            </Form.Label>
            <Form.Control
              type="date"
              value={dateStart}
              min={todayString()}
              onChange={(event) => {
                setDateStart(event.target.value);
                setValidationError(null);
              }}
              disabled={createLoading}
            />
          </Form.Group>

          <Form.Group controlId="rental-date-end">
            <Form.Label className="rental-form__label">
              Дата окончания аренды
            </Form.Label>
            <Form.Control
              type="date"
              value={dateEnd}
              min={dateStart || todayString()}
              onChange={(event) => {
                setDateEnd(event.target.value);
                setValidationError(null);
              }}
              disabled={createLoading}
            />
          </Form.Group>
        </div>

        {validationError && (
          <p className="rental-form__error" role="alert">
            {validationError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="rental-form__submit"
          disabled={createLoading}
        >
          {createLoading ? 'Бронирование…' : 'Забронировать'}
        </Button>
      </Form>
    </section>
  );
};

export default RentalForm;
