import { useState, type FormEvent } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import ErrorAlert from '../common/ErrorAlert';
import { createAdminUser } from '../../features/users/usersSlice';
import type { UserRole } from '../../types';

interface FieldErrors {
  email?: string;
  password?: string;
  name?: string;
  contactPhone?: string;
}

interface CreateUserFormProps {
  /** Вызывается после успешного создания — список нужно обновить. */
  onCreated: () => void;
}

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const PHONE_REGEX = /^[+0-9 ()-]+$/;

/** Форма создания пользователя через POST /api/admin/users. */
const CreateUserForm = ({ onCreated }: CreateUserFormProps) => {
  const dispatch = useAppDispatch();
  const { createLoading, createError } = useAppSelector(
    (state) => state.users,
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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
      next.contactPhone = 'Телефон может содержать только символы +0-9 ()-';
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
        createAdminUser({
          email: email.trim(),
          password,
          name: name.trim(),
          contactPhone: contactPhone.trim() || undefined,
          role,
        }),
      ).unwrap();

      // Очищаем форму и обновляем список.
      setEmail('');
      setPassword('');
      setName('');
      setContactPhone('');
      setRole('client');
      onCreated();
    } catch {
      // Сообщение об ошибке уже сохранено в Redux и показывается ниже.
    }
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      {createError && <ErrorAlert message={createError} />}
      <Row className="g-3">
        <Col xs={12} md={4}>
          <Form.Group controlId="create-email" className="mb-0">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              isInvalid={Boolean(fieldErrors.email)}
              required
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.email}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="create-password" className="mb-0">
            <Form.Label>Пароль</Form.Label>
            <Form.Control
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              isInvalid={Boolean(fieldErrors.password)}
              autoComplete="new-password"
              required
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.password}
            </Form.Control.Feedback>
            <Form.Text>Минимум 8 символов.</Form.Text>
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="create-name" className="mb-0">
            <Form.Label>Имя</Form.Label>
            <Form.Control
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              isInvalid={Boolean(fieldErrors.name)}
              required
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.name}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="create-phone" className="mb-0">
            <Form.Label>Контактный телефон</Form.Label>
            <Form.Control
              type="tel"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              isInvalid={Boolean(fieldErrors.contactPhone)}
              placeholder="+7 (000) 000-00-00"
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrors.contactPhone}
            </Form.Control.Feedback>
            <Form.Text>Необязательно.</Form.Text>
          </Form.Group>
        </Col>
        <Col xs={12} md={4}>
          <Form.Group controlId="create-role" className="mb-0">
            <Form.Label>Роль</Form.Label>
            <Form.Select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
            >
              <option value="client">Клиент</option>
              <option value="manager">Менеджер</option>
              <option value="admin">Администратор</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col xs={12} md={4} className="d-flex align-items-end">
          <Button
            type="submit"
            variant="primary"
            disabled={createLoading}
            className="w-100"
          >
            {createLoading ? 'Создание…' : 'Создать пользователя'}
          </Button>
        </Col>
      </Row>
    </Form>
  );
};

export default CreateUserForm;
