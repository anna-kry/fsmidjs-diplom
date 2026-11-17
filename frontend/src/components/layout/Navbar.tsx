import { Button, Nav, Navbar, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

/**
 * Шапка сайта (макет Figma, header 1:2434).
 * Меню зависит от роли пользователя (спецификация, раздел 7).
 */
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
    <Navbar as="header" className="navbar-app" expand="lg" collapseOnSelect>
      <Container>
        <Navbar.Brand as={Link} to="/" className="navbar-app__logo">
          Библиотеки
        </Navbar.Brand>
        <Navbar.Toggle
          aria-controls="main-navbar-nav"
          className="navbar-app__toggler"
        >
          <span className="navbar-app__toggler-icon" />
        </Navbar.Toggle>
        <Navbar.Collapse id="main-navbar-nav" className="navbar-app__collapse">
          <Nav className="navbar-app__nav">
            <Nav.Link as={Link} to="/" className="navbar-app__link">
              Книги
            </Nav.Link>
            {user?.role === 'client' && (
              <>
                <Nav.Link as={Link} to="/my/rentals" className="navbar-app__link">
                  Мои брони
                </Nav.Link>
                <Nav.Link as={Link} to="/support" className="navbar-app__link">
                  Поддержка
                </Nav.Link>
              </>
            )}
            {user?.role === 'manager' && (
              <>
                <Nav.Link as={Link} to="/manager/users" className="navbar-app__link">
                  Пользователи
                </Nav.Link>
                <Nav.Link as={Link} to="/manager/rentals" className="navbar-app__link">
                  Брони
                </Nav.Link>
                <Nav.Link as={Link} to="/manager/support" className="navbar-app__link">
                  Обращения
                </Nav.Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Nav.Link as={Link} to="/admin/libraries" className="navbar-app__link">
                  Библиотеки
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/books" className="navbar-app__link">
                  Книги (упр.)
                </Nav.Link>
                <Nav.Link as={Link} to="/admin/users" className="navbar-app__link">
                  Пользователи
                </Nav.Link>
              </>
            )}
          </Nav>
          {user ? (
            <div className="navbar-app__user">
              <span className="navbar-app__name">{user.name}</span>
              <Button
                variant="link"
                className="navbar-app__button navbar-app__button--ghost"
                onClick={() => void handleLogout()}
              >
                Выход
              </Button>
            </div>
          ) : (
            <div className="navbar-app__user">
              <Link to="/login" className="navbar-app__button">
                Вход
              </Link>
              <Link to="/register" className="navbar-app__link">
                Регистрация
              </Link>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default LayoutNavbar;
