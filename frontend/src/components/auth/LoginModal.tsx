import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../common/ErrorAlert';
import { clearError, login } from '../../features/auth/authSlice';
import { closeLoginModal, openRegisterModal } from '../../features/ui/uiSlice';
import type { UserRole } from '../../types';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const EYE_OPEN = '👁️';
const EYE_CLOSED = '🙈';

const LoginModal = () => {
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const { isLoginModalOpen, showRegisteredMessage } = useAppSelector((state) => state.ui);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const handleClose = () => dispatch(closeLoginModal());
  const handleSwitchToRegister = () => {
    dispatch(closeLoginModal());
    dispatch(openRegisterModal());
  };

  useEffect(() => {
    if (isLoginModalOpen) {
      dispatch(clearError());
      setEmail('');
      setPassword('');
      setFieldErrors({});
      setPasswordVisible(false);
    }
  }, [isLoginModalOpen, dispatch]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!email.trim()) {
      next.email = 'Укажите email';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Введите корректный email';
    }
    if (!password) {
      next.password = 'Укажите пароль';
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      const user = await dispatch(
        login({ email: email.trim(), password })
      ).unwrap();
      const roleToPath: Record<UserRole, string> = {
        admin: '/admin/main',
        manager: '/manager/main',
        client: '/user/main',
      };
      dispatch(closeLoginModal());
      window.location.href = roleToPath[user.role] ?? '/';
    } catch {
      // Сообщение об ошибке уже сохранено в Redux и показывается ниже.
    }
  };

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  if (!isLoginModalOpen) {
    return null;
  }

  return (
    <div className="auth__backdrop" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className="auth__popup" tabIndex={-1}>
        <button
          type="button"
          className="auth__close"
          onClick={handleClose}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h1 id="login-title" className="auth__title">
          Вход
        </h1>
        {showRegisteredMessage && (
          <Alert variant="success">
            Регистрация прошла успешно. Войдите в систему.
          </Alert>
        )}
        {error && <ErrorAlert message={error} />}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="auth__form-group" controlId="login-email">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              className={`auth__input ${fieldErrors.email ? 'auth__input--invalid' : ''}`}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
            {fieldErrors.email && (
              <Form.Control.Feedback type="invalid">
                {fieldErrors.email}
              </Form.Control.Feedback>
            )}
          </Form.Group>
          <Form.Group className="auth__form-group--password" controlId="login-password">
            <Form.Label>Пароль</Form.Label>
            <div className="auth__input-wrapper">
              <Form.Control
                type={passwordVisible ? 'text' : 'password'}
                className={`auth__input ${fieldErrors.password ? 'auth__input--invalid' : ''}`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
              <span
                className="auth__eye"
                role="button"
                tabIndex={0}
                onClick={togglePassword}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    togglePassword();
                  }
                }}
                aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {passwordVisible ? EYE_CLOSED : EYE_OPEN}
              </span>
            </div>
            {fieldErrors.password && (
              <Form.Control.Feedback type="invalid">
                {fieldErrors.password}
              </Form.Control.Feedback>
            )}
          </Form.Group>
          <button
            type="submit"
            className="auth__button button__main button__main--primary"
            disabled={loading}
          >
            {loading ? 'Входит…' : 'Войти'}
          </button>
        </Form>
        <p className="auth__footer">
          Нет аккаунт?{' '}
          <button
            type="button"
            className="auth__footer-link"
            onClick={handleSwitchToRegister}
          >
            Зарегистрироваться
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginModal;