import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import Loader from '../common/Loader';

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Страницы только для авторизованных: гость уходит на страницу входа. */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) {
    return <Loader text="Проверка сессии…" fullPage />;
  }

  if (!user) {
    // Запоминаем, откуда пришли, чтобы вернуть пользователя после входа.
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
