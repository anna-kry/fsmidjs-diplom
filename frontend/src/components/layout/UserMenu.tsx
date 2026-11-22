import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';
import type { UserRole } from '../../types';

interface UserMenuItem {
  to: string;
  label: string;
  end?: boolean;
  icon: React.ReactNode;
  roles: UserRole[];
}

/** Иконка 24×24: обводка 1.5, цвет наследуется от текста пункта. */
const MenuIcon = ({ children }: { children: React.ReactNode }) => (
  <svg
    className="user-menu__icon"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

/** Пункты бокового меню по ролям. */
const MENU_ITEMS: Record<UserRole, UserMenuItem[]> = {
  admin: [
    {
      to: '/admin/main',
      label: 'Главная',
      end: true,
      roles: ['admin'],
      icon: (
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      ),
    },
    {
      to: '/admin/libraries',
      label: 'Библиотеки',
      roles: ['admin'],
      icon: (
        <>
          <path d="m16 6 4 14" />
          <path d="M12 6v14" />
          <path d="M8 8v12" />
          <path d="M4 4v16" />
        </>
      ),
    },
    {
      to: '/admin/users',
      label: 'Пользователи',
      roles: ['admin'],
      icon: (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      ),
    },
    {
      to: '/admin/settings',
      label: 'Настройки',
      roles: ['admin'],
      icon: (
        <path d="M12 3L1 9l11 6 9-4 9 4-9-2z" />
      ),
    },
  ],
  manager: [
    {
      to: '/manager/main',
      label: 'Главная',
      end: true,
      roles: ['manager'],
      icon: (
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      ),
    },
    {
      to: '/manager/users',
      label: 'Пользователи',
      roles: ['manager'],
      icon: (
        <path d="M12 3L1 9l11 6 9-4 9 4-9-2z" />
      ),
    },
    {
      to: '/manager/rentals',
      label: 'Книги',
      roles: ['manager'],
      icon: (
        <path d="M12 3L1 9l11 6 9-4 9 4-9-2z" />
      ),
    },    
    {
      to: '/manager/support',
      label: 'Обращения',
      roles: ['manager'],
      icon: (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      ),
    },
    {
      to: '/manager/settings',
      label: 'Настройки',
      roles: ['manager'],
      icon: (
        <path d="M12 3L1 9l11 6 9-4 9 4-9-2z" />
      ),
    },
  ],
  client: [
    {
      to: '/user/main',
      label: 'Главная',
      end: true,
      roles: ['client'],
      icon: (
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      ),
    },
    {
      to: '/user/rentals',
      label: 'Мои брони',
      roles: ['client'],
      icon: (
        <>
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </>
      ),
    },
    {
      to: '/support',
      label: 'Поддержка',
      roles: ['client'],
      icon: (
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      ),
    },
    {
      to: '/user/settings',
      label: 'Настройки',
      roles: ['client'],
      icon: (
        <path d="M12 3L1 9l11 6 9-4 9 4-9-2z" />
      ),
    },
  ],
};

/** Пути, на которых отображается боковое меню. */
const MENU_PATHS = [
  '/admin/main',
  '/manager/main',
  '/user/main',
  '/admin/users',
  '/admin/libraries',
  '/admin/books',
  '/admin/settings',
  '/manager/settings',
  '/manager/users',
  '/manager/rentals',
  '/manager/support',
  '/user/settings',
  '/user/rentals',
  '/support',
];

/**
 * Боковое меню личного кабинета (макет Figma):
 * — аватар с приветствием по имени;
 * — пункты навигации, зависящие от роли (admin / manager / client);
 * — выход и логотип в подвале панели.
 * Активный пункт подсвечивается оранжевым — как в макете.
 */
const UserMenu = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);

  const role = user?.role as UserRole | undefined;
  const items = role ? MENU_ITEMS[role] : [];

  const shouldShow = Boolean(user && role && MENU_PATHS.includes(location.pathname));

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/');
  };

  const initial = user?.name.trim().charAt(0).toUpperCase() ?? '';

  if (!shouldShow) return null;

  return (
    <aside className="user-menu">
      <div className="user-menu__profile">
        <div className="user-menu__avatar" aria-hidden="true">
          {initial}
        </div>
        <p className="user-menu__greeting">
          Привет, {user?.name ?? 'пользователь'}!
        </p>
      </div>

      <nav className="user-menu__nav" aria-label="Основное меню">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive
                ? 'user-menu__link user-menu__link--active'
                : 'user-menu__link'
            }
          >
            <MenuIcon>{item.icon}</MenuIcon>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="user-menu__footer">
        <button
          type="button"
          className="user-menu__logout"
          onClick={() => void handleLogout()}
        >
          <MenuIcon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </MenuIcon>
          <span>Выход</span>
        </button>
        <span className="user-menu__logo">Библиотеки</span>
      </div>
    </aside>
  );
};

export default UserMenu;
