import Navbar from './Navbar';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Navbar />
      <main className="container py-4">
        {children}
      </main>
    </>
  );
};

export default Layout;
