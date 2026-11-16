import { useEffect, useState, type FormEvent } from 'react';
import { Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import ErrorAlert from '../components/common/ErrorAlert';
import { clearError, register } from '../features/auth/authSlice';

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
  contactPhone?: string;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
// Разрешённые символы телефона — как в Backend DTO.
const PHONE_REGEX = /^[+0-9 ()-]+$/;

const EYE_OPEN = '👁️';
const EYE_CLOSED = '🙈';

const RegisterPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Ошибка прошлой попытки не должна всплыть на этой странице заново.
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};

    if (!email.trim()) {
      next.email = 'Укажите email';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      next.email = 'Введите корректный email';
    }

    if (!password) {
      next.password = 'Укажите пароль';
    } else if (password.length < 8) {
      next.password = 'Пароль должен быть не короче 8 символов';
    }

    if (!name.trim()) {
      next.name = 'Укажите имя';
    } else if (name.trim().length > 100) {
      next.name = 'Имя должно быть не длиннее 100 символов';
    }

    const phone = contactPhone.trim();
    if (phone && !PHONE_REGEX.test(phone)) {
      next.contactPhone =
        'Телефон может содержать только символы +0-9 ()-';
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
      await dispatch(
        register({
          email: email.trim(),
          password,
          name: name.trim(),
          contactPhone: contactPhone.trim() || undefined,
        }),
      ).unwrap();
      // Backend не выполняет вход автоматически — направляем на страницу входа.
      navigate('/login', { state: { registered: true } });
    } catch {
      // Сообщение об ошибке уже сохранено в Redux и показывается ниже.
    }
  };

  const togglePassword = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div className="auth__backdrop" role="dialog" aria-modal="true" aria-labelledby="register-title">
      <div className="auth__popup" tabIndex={-1}>
        <button
          type="button"
          className="auth__close"
          onClick={() => navigate('/')}
          aria-label="Закрыть"
        >
          ×
        </button>
        <h1 id="register-title" className="auth__title">
          Регистрация
        </h1>
        {error && <ErrorAlert message={error} />}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3" controlId="register-email">
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
          <Form.Group className="mb-3" controlId="register-password">
            <Form.Label>Пароль</Form.Label>
            <div className="auth__input-wrapper">
              <Form.Control
                type={passwordVisible ? 'text' : 'password'}
                className={`auth__input ${fieldErrors.password ? 'auth__input--invalid' : ''}`}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
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
            <Form.Text>Минимум 8 символов.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="register-name">
            <Form.Label>Имя</Form.Label>
            <Form.Control
              type="text"
              className={`auth__input ${fieldErrors.name ? 'auth__input--invalid' : ''}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
            />
            {fieldErrors.name && (
              <Form.Control.Feedback type="invalid">
                {fieldErrors.name}
              </Form.Control.Feedback>
            )}
          </Form.Group>
          <Form.Group className="mb-4" controlId="register-phone">
            <Form.Label>Контактный телефон</Form.Label>
            <Form.Control
              type="tel"
              className={`auth__input ${fieldErrors.contactPhone ? 'auth__input--invalid' : ''}`}
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              autoComplete="tel"
              placeholder="+7 (000) 000-00-00"
            />
            {fieldErrors.contactPhone && (
              <Form.Control.Feedback type="invalid">
                {fieldErrors.contactPhone}
              </Form.Control.Feedback>
            )}
            <Form.Text>Необязательно.</Form.Text>
          </Form.Group>
          <button
            type="submit"
            className="auth__button button__main button__main--primary"
            disabled={loading}
          >
            {loading ? 'Регистрация…' : 'Зарегистрироваться'}
          </button>
        </Form>
        <p className="auth__footer">
          Уже есть аккаунт?{' '}
          <Link to="/login" onClick={() => navigate('/login')}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
