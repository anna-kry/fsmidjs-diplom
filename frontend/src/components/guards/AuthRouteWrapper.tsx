import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch } from '../../app/hooks';
import { openLoginModal, openRegisterModal } from '../../features/ui/uiSlice';

interface AuthRouteWrapperProps {
  mode: 'login' | 'register';
}

/**
 * Обёртка для прямых переходов на /login или /register.
 * Открывает соответствующее модальное окно и перенаправляет на главную,
 * чтобы модалка отобразилась поверх HomePage.
 */
const AuthRouteWrapper = ({ mode }: AuthRouteWrapperProps) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (mode === 'login') {
      dispatch(openLoginModal());
    } else {
      dispatch(openRegisterModal());
    }
    // Сохраняем from, чтобы после входа вернуть туда, откуда пришли
    const from = location.state?.from ?? '/';
    navigate(from, { replace: true, state: { from } });
  }, [dispatch, mode, navigate, location]);

  // Не рендерим ничего — редирект произойдёт сразу
  return <Navigate to="/" replace />;
};

export default AuthRouteWrapper;