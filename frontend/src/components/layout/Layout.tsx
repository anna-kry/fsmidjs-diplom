import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import UserMenu from './UserMenu';
import Footer from './Footer';
import ScrollToHash from '../common/ScrollToHash';

/**
 * Каркас приложения: шапка, боковое меню кабинета, контент и футер.
 * Flex-колонка с min-height: 100vh — если контент меньше вьюпорта,
 * футер всё равно прижат к низу страницы (sticky footer).
 */
const Layout = () => {
  return (
    <div className="layout">
      <ScrollToHash />
      <Navbar />
      <main className="layout__content">
        <UserMenu />
        <div className="layout__main">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
