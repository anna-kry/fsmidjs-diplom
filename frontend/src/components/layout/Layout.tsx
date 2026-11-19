import Navbar from './Navbar';
import UserMenu from './UserMenu';
import Footer from './Footer';

/**
 * Каркас приложения: шапка, боковое меню кабинета, контент и футер.
 * Flex-колонка с min-height: 100vh — если контент меньше вьюпорта,
 * футер всё равно прижат к низу страницы (sticky footer).
 */
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__content">
        <UserMenu />
        <div className="layout__main">{children}</div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
