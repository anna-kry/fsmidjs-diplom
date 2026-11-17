import Navbar from './Navbar';
import Footer from './Footer';

/**
 * Каркас приложения: шапка, контент и футер.
 * Flex-колонка с min-height: 100vh — если контент меньше вьюпорта,
 * футер всё равно прижат к низу страницы (sticky footer).
 */
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__main container py-4">
        {children}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
