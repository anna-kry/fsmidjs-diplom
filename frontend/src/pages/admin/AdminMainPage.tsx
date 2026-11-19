import { Container } from 'react-bootstrap';

/** Главная страница личного кабинета администратора. */
const AdminMainPage = () => (
  <Container>
    <h1 className="admin-main__heading">Личный кабинет администратора</h1>
    <p className="admin-main__desc">
      Здесь вы можете управлять библиотеками, книгами и пользователями.
    </p>
  </Container>
);

export default AdminMainPage;
