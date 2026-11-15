import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import BookPage from '../pages/BookPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import MyRentalsPage from '../pages/MyRentalsPage';
import SupportPage from '../pages/SupportPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminLibrariesPage from '../pages/admin/AdminLibrariesPage';
import AdminBooksPage from '../pages/admin/AdminBooksPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import ManagerUsersPage from '../pages/manager/ManagerUsersPage';
import ManagerRentalsPage from '../pages/manager/ManagerRentalsPage';
import ManagerSupportPage from '../pages/manager/ManagerSupportPage';

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/books/:id" element={<BookPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/my/rentals" element={<MyRentalsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/admin/libraries" element={<AdminLibrariesPage />} />
      <Route path="/admin/books" element={<AdminBooksPage />} />
      <Route path="/admin/users" element={<AdminUsersPage />} />
      <Route path="/manager/users" element={<ManagerUsersPage />} />
      <Route path="/manager/rentals" element={<ManagerRentalsPage />} />
      <Route path="/manager/support" element={<ManagerSupportPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRouter;
