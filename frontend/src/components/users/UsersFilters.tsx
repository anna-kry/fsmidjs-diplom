import { useState, type FormEvent } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import type { UserFilters } from '../../types';

interface UsersFiltersProps {
  onApply: (filters: UserFilters) => void;
  onReset: () => void;
}

/** Фильтры списков пользователей: email, имя, контактный телефон. */
const UsersFilters = ({ onApply, onReset }: UsersFiltersProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply({
      email: email.trim(),
      name: name.trim(),
      contactPhone: contactPhone.trim(),
    });
  };

  const handleReset = () => {
    setEmail('');
    setName('');
    setContactPhone('');
    onReset();
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="users-filters__row">
        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-email">Email</Form.Label>
          <Form.Control
            id="filter-email"
            type="search"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Часть email"
          />
        </Col>
        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-name">Имя</Form.Label>
          <Form.Control
            id="filter-name"
            type="search"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Часть имени"
          />
        </Col>
        <Col xs={12} md={4}>
          <Form.Label htmlFor="filter-phone">Контактный телефон</Form.Label>
          <Form.Control
            id="filter-phone"
            type="search"
            value={contactPhone}
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="Часть телефона"
          />
        </Col>
      </Row>
      <div className="users-filters__actions">
        <Button type="submit" variant="primary">
          Найти
        </Button>
        <Button type="button" variant="outline-secondary" onClick={handleReset}>
          Сбросить
        </Button>
      </div>
    </Form>
  );
};

export default UsersFilters;
