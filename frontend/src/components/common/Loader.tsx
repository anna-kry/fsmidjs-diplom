import { Spinner } from 'react-bootstrap';

interface LoaderProps {
  text?: string;
  /** Занимает почти весь экран — для первичной проверки сессии. */
  fullPage?: boolean;
}

const Loader = ({ text = 'Загрузка…', fullPage = false }: LoaderProps) => {
  return (
    <div
      role="status"
      className={
        fullPage
          ? 'd-flex justify-content-center align-items-center min-vh-100 py-5'
          : 'text-center py-4'
      }
    >
      <Spinner animation="border" size="sm" className="me-2" />
      <span>{text}</span>
    </div>
  );
};

export default Loader;
