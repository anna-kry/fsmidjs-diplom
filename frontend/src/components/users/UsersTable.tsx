import type { UserListItem } from '../../types';

/** Таблица пользователей с состоянием пустого результата поиска. */
const UsersTable = ({ items }: { items: UserListItem[] }) => {
  if (items.length === 0) {
    return (
      <p className="text-body-secondary text-center py-4">
        Пользователи не найдены. Измените фильтры поиска.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped align-middle">
        <thead>
          <tr>
            <th scope="col">ID</th>
            <th scope="col">Email</th>
            <th scope="col">Имя</th>
            <th scope="col">Контактный телефон</th>
          </tr>
        </thead>
        <tbody>
          {items.map((user) => (
            <tr key={user.id}>
              <td>{user.id}</td>
              <td>{user.email}</td>
              <td>{user.name}</td>
              <td>{user.contactPhone || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;
