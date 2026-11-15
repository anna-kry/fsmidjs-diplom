import { Nav, Navbar, Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const GuestNavbar = () => {
  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Библиотеки
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">Книги</Nav.Link>
          </Nav>
          <Nav>
            <Nav.Link as={Link} to="/login">Вход</Nav.Link>
            <Nav.Link as={Link} to="/register">Регистрация</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

const LayoutNavbar = () => {
  return <GuestNavbar />;
};

export default LayoutNavbar;
