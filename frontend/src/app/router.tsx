import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import BookSearchPage from '../pages/BookSearchPage';
import BookPage from '../pages/BookPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import MyRentalsPage from '../pages/MyRentalsPage';
import SupportPage from '../pages/SupportPage';
import NotFoundPage from '../pages/NotFoundPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import AdminLibrariesPage from '../pages/admin/AdminLibrariesPage';
import AdminBooksPage from '../pages/admin/AdminBooksPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminMainPage from '../pages/admin/AdminMainPage';
import ManagerUsersPage from '../pages/manager/ManagerUsersPage';
import ManagerRentalsPage from '../pages/manager/ManagerRentalsPage';
import ManagerSupportPage from '../pages/manager/ManagerSupportPage';
import ManagerMainPage from '../pages/manager/ManagerMainPage';
import ClientMainPage from '../pages/client/ClientMainPage';
import GuestRoute from '../components/guards/GuestRoute';
import RoleRoute from '../components/guards/RoleRoute';
import Layout from '../components/layout/Layout';

const AppRouter = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/search" element={<BookSearchPage />} />
        <Route path="/books/:id" element={<BookPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/user/rentals"
          element={
            <RoleRoute roles={['client']}>
              <MyRentalsPage />
            </RoleRoute>
          }
        />
        {/* Старый адрес страницы броней — чтобы не сломать закладки и ссылки */}
        <Route
          path="/my/rentals"
          element={<Navigate to="/user/rentals" replace />}
        />
        <Route
          path="/support"
          element={
            <RoleRoute roles={['client']}>
              <SupportPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/libraries"
          element={
            <RoleRoute roles={['admin']}>
              <AdminLibrariesPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/books"
          element={
            <RoleRoute roles={['admin']}>
              <AdminBooksPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute roles={['admin']}>
              <AdminUsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/users"
          element={
            <RoleRoute roles={['manager']}>
              <ManagerUsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/rentals"
          element={
            <RoleRoute roles={['manager']}>
              <ManagerRentalsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/support"
          element={
            <RoleRoute roles={['manager']}>
              <ManagerSupportPage />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/main"
          element={
            <RoleRoute roles={['admin']}>
              <AdminMainPage />
            </RoleRoute>
          }
        />
        <Route
          path="/manager/main"
          element={
            <RoleRoute roles={['manager']}>
              <ManagerMainPage />
            </RoleRoute>
          }
        />
        <Route
          path="/user/main"
          element={
            <RoleRoute roles={['client']}>
              <ClientMainPage />
            </RoleRoute>
          }
        />

      </Route>

      <Route path="*" element={<NotFoundPage />} />
      
    </Routes>
  );
};

export default AppRouter;
