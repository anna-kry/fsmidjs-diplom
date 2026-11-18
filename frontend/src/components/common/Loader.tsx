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
          ? 'loader--full-page'
          : 'loader--inline'
      }
    >
      <Spinner animation="border" size="sm" className="loader__spinner" />
      <span>{text}</span>
    </div>
  );
};

export default Loader;
