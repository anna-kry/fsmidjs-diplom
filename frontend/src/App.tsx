import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from './app/store';
import { useAppDispatch, useAppSelector } from './app/hooks';
import { fetchMe } from './features/auth/authSlice';
import Layout from './components/layout/Layout';
import Loader from './components/common/Loader';
import AppRouter from './app/router';

const AppContent = () => {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector((state) => state.auth.initialized);

  // На старте приложения восстанавливаем сессию по cookie.
  useEffect(() => {
    void dispatch(fetchMe());
  }, [dispatch]);

  // Пока первичная проверка не завершена, не показываем ни страницы,
  // ни редиректы: иначе гость мелькнёт на защищённых маршрутах.
  if (!initialized) {
    return <Loader text="Проверка сессии…" fullPage />;
  }

  return (
    <Layout>
      <AppRouter />
    </Layout>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
};

export default App;
