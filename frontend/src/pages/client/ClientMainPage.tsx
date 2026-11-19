import { Container } from 'react-bootstrap';

/** Главная страница личного кабинета пользователя (клиента). */
const ClientMainPage = () => (
  <Container>
    <h1 className="client-main__heading">Личный кабинет</h1>
    <p className="client-main__desc">
      Здесь вы можете управлять своими арендами и обращениями в поддержку.
    </p>
  </Container>
);

export default ClientMainPage;
