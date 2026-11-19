import { Container } from 'react-bootstrap';

/** Главная страница личного кабинета менеджера. */
const ManagerMainPage = () => (
  <Container>
    <h1 className="manager-main__heading">Личный кабинет менеджера</h1>
    <p className="manager-main__desc">
      Здесь вы можете просматривать пользователей и аренды.
    </p>
  </Container>
);

export default ManagerMainPage;
