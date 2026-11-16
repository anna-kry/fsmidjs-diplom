import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../app/hooks';
import type { UserRole } from '../../types';
import Loader from '../common/Loader';

interface RoleRouteProps {
  roles: UserRole[];
  children: ReactNode;
}

/**
 * Проверка роли: при недостатке прав — редирект на главную,
 * а не отображение чужой страницы. Backend всё равно проверяет права сам.
 */
const RoleRoute = ({ roles, children }: RoleRouteProps) => {
  const { user, initialized } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!initialized) {
    return <Loader text="Проверка сессии…" fullPage />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RoleRoute;
