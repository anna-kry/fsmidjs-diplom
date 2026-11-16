import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="not-found">
      <div className="not-found__books">📚📖📕</div>
      <h1 className="not-found__title">Ошибка</h1>
      <div className="not-found__code">404</div>
      <p className="not-found__subtitle">
        Упс, кажется что-то пошло не так
      </p>
      <Link to="/" className="auth__button button__main button__main--primary">
        На главную
      </Link>
    </div>
  );
};

export default NotFoundPage;
