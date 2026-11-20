import { Button, Navbar, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import type { UserRole } from '../../types';

/**
 * Шапка сайта по макету Figma (frame 1:810 «main»):
 * — слева: кнопка входа / выхода;
 * — справа от неё: имя пользователя (если залогинен);
 * — по центру: логотип «Библиотеки» (переход на главную);
 * — справа: якоря Библиотеки / На карту / О нас / Контакты.
 */
const LayoutNavbar = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  /** Путь в личный кабинет в зависимости от роли пользователя. */
  const getMainPath = (role: UserRole | undefined) => {
    switch (role) {
      case 'admin':
        return '/admin/main';
      case 'manager':
        return '/manager/main';
      case 'client':
        return '/user/main';
      default:
        return '/';
    }
  };

  return (
    <Navbar as="header" className="navbar-app" expand="lg" collapseOnSelect>
      <Container className="navbar-app__container">
        {/* Слева: вход / выход + имя пользователя */}
        <div className="navbar-app__left">
          {!user ? (
            <Link to="/login" className="navbar-app__auth-btn ">
              Войти
            </Link>
          ) : (
            <>
              <Button
                variant="link"
                className="navbar-app__auth-btn"
                onClick={() => void handleLogout()}
              >
                Выйти
              </Button>
              <span
                className="navbar-app__user-name"
                onClick={() => navigate(getMainPath(user.role))}
                style={{ cursor: 'pointer' }}
              >
                {user.name}
              </span>
            </>
          )}
        </div>

        {/* По центру: логотип */}
        <div className="navbar-app__center">
          <Navbar.Brand as={Link} to="/" className="navbar-app__logo">
            Библиотеки
          </Navbar.Brand>
        </div>

        {/* Справа: якоря навигации */}
        <nav className="navbar-app__right">
          <Link to="#" className="navbar-app__anchor">
            Библиотеки
          </Link>
          <Link to="#about" className="navbar-app__anchor">
            О нас
          </Link>
          <Link to="#footer" className="navbar-app__anchor">
            Контакты
          </Link>
        </nav>
      </Container>
    </Navbar>
  );
};

export default LayoutNavbar;
