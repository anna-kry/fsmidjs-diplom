import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Form } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import { clearError, login } from '../features/auth/authSlice';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const EYE_OPEN = '👁️';
const EYE_CLOSED = '🙈';

const LoginPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Ошибка прошлой попытки входа не должна всплыть на этой странице заново.
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Куда перейти после входа: страница, с которой гость был перенаправлен.
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const registered = Boolean(
    (location.state as { registered?: boolean } | null)?.registered,
  );

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
      await dispatch(login({ email: email.trim(), password })).unwrap();
      navigate(from, { replace: true });
    } catch {
      // Сообщение об ошибке уже сохранено в Redux и показывается ниже.
    }
  };

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className="auth__backdrop" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className="auth__popup" tabIndex={-1}>
        <button
          type="button"
          className="auth__close"
          onClick={() => navigate('/')}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h1 id="login-title" className="auth__title">
          Вход
        </h1>
        {registered && (
          <Alert variant="success">
            Регистрация прошла успешно. Войдите в систему.
          </Alert>
        )}
        {error && <ErrorAlert message={error} />}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="login-email">
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
          <Form.Group className="mb-4" controlId="login-password">
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
          Нет аккаунта?{' '}
          <Link to="/register" onClick={() => navigate('/register')}>
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
