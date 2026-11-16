import { Button, Nav, Navbar, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

/** Меню зависит от роли пользователя (спецификация, раздел 7). */
const LayoutNavbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    // После выхода возвращаемся на публичную страницу.
    navigate('/');
  };

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/">
          Библиотеки
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar-nav" />
        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/">
              Книги
            </Nav.Link>
            {user?.role === 'client' && (
              <>
                <Nav.Link as={Link} to="/my/rentals">
                  Мои брони
                </Nav.Link>
                <Nav.Link as={Link} to="/support">
                  Поддержка
                </Nav.Link>
              </>
            )}
            {user?.role === 'manager' && (
              <>
                <Nav.Link as={Link} to="/manager/users">
                  Пользователи
                </Nav.Link>
                <Nav.Link as={Link} to="/manager/rentals">
                  Брони
                </Nav.Link>
                <Nav.Link as={Link} to="/manager/support">
                  Обращения
                </Nav.Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Nav.Link as={Link} to="/admin/libraries">
                  Библиотеки
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/books">
                  Книги (упр.)
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/users">
                  Пользователи
                </Nav.Link>
              </>
            )}
          </Nav>
          {user ? (
            <div className="d-flex align-items-center">
              <Navbar.Text className="me-3">{user.name}</Navbar.Text>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => void handleLogout()}
              >
                Выход
              </Button>
            </div>
          ) : (
            <Nav>
              <Nav.Link as={Link} to="/login">
                Вход
              </Nav.Link>
              <Nav.Link as={Link} to="/register">
                Регистрация
              </Nav.Link>
            </Nav>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default LayoutNavbar;
