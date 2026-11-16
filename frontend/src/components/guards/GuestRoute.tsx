import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import Loader from '../common/Loader';

interface GuestRouteProps {
  children: ReactNode;
}

/** Страницы входа и регистрации: уже вошедший пользователь перенаправляется. */
const GuestRoute = ({ children }: GuestRouteProps) => {
  const { user, initialized } = useAppSelector((state) => state.auth);

  // До завершения первичной проверки сессии редиректы делать нельзя.
  if (!initialized) {
    return <Loader text="Проверка сессии…" fullPage />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default GuestRoute;
