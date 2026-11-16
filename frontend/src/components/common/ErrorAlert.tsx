import { Alert } from 'react-bootstrap';

/** Сообщение об ошибке API для показа пользователю. */
const ErrorAlert = ({ message }: { message: string }) => {
  return <Alert variant="danger">{message}</Alert>;
};

export default ErrorAlert;
