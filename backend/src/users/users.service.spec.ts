import 'reflect-metadata';
import { Repository } from 'typeorm';
import { escapeLike } from '../common/utils/escape-like';
import { User } from './entities/user.entity';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

interface RepositoryMock {
  create: jest.Mock;
  save: jest.Mock;
  findOneBy: jest.Mock;
  createQueryBuilder: jest.Mock;
}

interface QueryBuilderMock {
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getMany: jest.Mock;
}

describe('PasswordService', () => {
  const passwordService = new PasswordService();

  it('hash: пароль хешируется, хеш не совпадает с паролем', async () => {
    const password = 'Passw0rd!';
    const hash = await passwordService.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('compare: true для верного пароля и false для неверного', async () => {
    const hash = await passwordService.hash('Passw0rd!');

    await expect(passwordService.compare('Passw0rd!', hash)).resolves.toBe(
      true,
    );
    await expect(passwordService.compare('wrong-password', hash)).resolves.toBe(
      false,
    );
  });
});

describe('escapeLike', () => {
  it('экранирует %, _ и обратный слэш', () => {
    expect(escapeLike('100%_new')).toBe('100\\%\\_new');
    expect(escapeLike('back\\slash')).toBe('back\\\\slash');
  });

  it('не меняет обычный текст', () => {
    expect(escapeLike('ivanov')).toBe('ivanov');
  });
});

describe('UsersService', () => {
  let repository: RepositoryMock;
  let queryBuilder: QueryBuilderMock;
  let usersService: UsersService;
  let passwordService: PasswordService;

  beforeEach(() => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    repository = {
      create: jest.fn().mockImplementation((data: Partial<User>) => ({
        ...data,
      })),
      save: jest
        .fn()
        .mockImplementation((data: Partial<User>) =>
          Promise.resolve({ id: 1, ...data }),
        ),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    usersService = new UsersService(
      repository as unknown as Repository<User>,
    );
    passwordService = new PasswordService();
  });

  describe('create', () => {
    it('передаёт данные в репозиторий и возвращает созданного пользователя', async () => {
      const result = await usersService.create({
        email: 'a@a.ru',
        name: 'Иван',
        role: 'client',
        passwordHash: 'hash-value',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'a@a.ru',
          name: 'Иван',
          role: 'client',
          passwordHash: 'hash-value',
        }),
      );
      expect(repository.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ id: 1, email: 'a@a.ru' });
    });

    it('сохраняет в БД хеш пароля, а не открытый пароль', async () => {
      const password = 'Passw0rd!';
      const passwordHash = await passwordService.hash(password);

      await usersService.create({
        email: 'a@a.ru',
        name: 'Иван',
        role: 'client',
        passwordHash,
      });

      const saved = repository.save.mock.calls[0][0] as User;
      expect(saved.passwordHash).toBe(passwordHash);
      expect(saved.passwordHash).not.toBe(password);
      await expect(
        passwordService.compare(password, saved.passwordHash),
      ).resolves.toBe(true);
    });

    it('приводит email к нижнему регистру', async () => {
      await usersService.create({
        email: 'User@Example.COM',
        name: 'Иван',
        role: 'client',
        passwordHash: 'hash-value',
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@example.com' }),
      );
    });
  });

  describe('findById', () => {
    it('возвращает пользователя по id', async () => {
      const user = { id: 5, email: 'a@a.ru' } as User;
      repository.findOneBy.mockResolvedValue(user);

      const result = await usersService.findById(5);

      expect(repository.findOneBy).toHaveBeenCalledWith({ id: 5 });
      expect(result).toBe(user);
    });

    it('возвращает null, если пользователь не найден', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await usersService.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('ищет по email в нижнем регистре', async () => {
      const user = { id: 1, email: 'user@example.com' } as User;
      repository.findOneBy.mockResolvedValue(user);

      const result = await usersService.findByEmail('User@Example.COM');

      expect(repository.findOneBy).toHaveBeenCalledWith({
        email: 'user@example.com',
      });
      expect(result).toBe(user);
    });

    it('возвращает null, если пользователь не найден', async () => {
      repository.findOneBy.mockResolvedValue(null);

      const result = await usersService.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    const emptyFilters = { email: '', name: '', contactPhone: '' };

    it('применяет пагинацию limit/offset', async () => {
      await usersService.findAll({
        ...emptyFilters,
        limit: 20,
        offset: 40,
      });

      expect(queryBuilder.skip).toHaveBeenCalledWith(40);
      expect(queryBuilder.take).toHaveBeenCalledWith(20);
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.getMany).toHaveBeenCalledTimes(1);
    });

    it('ищет по частичному совпадению через ILIKE', async () => {
      await usersService.findAll({
        ...emptyFilters,
        email: 'ivan',
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email ILIKE :email',
        { email: '%ivan%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(1);
    });

    it('ищет по имени и телефону, комбинируя фильтры', async () => {
      await usersService.findAll({
        email: '',
        name: 'петр',
        contactPhone: '+7 (999)',
        limit: 10,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.name ILIKE :name',
        { name: '%петр%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.contactPhone ILIKE :contactPhone',
        { contactPhone: '%+7 (999)%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });

    it('экранирует специальные символы в поисковом запросе', async () => {
      await usersService.findAll({
        ...emptyFilters,
        email: 'a%b_c',
        limit: 20,
        offset: 0,
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'user.email ILIKE :email',
        { email: '%a\\%b\\_c%' },
      );
    });

    it('возвращает результат запроса', async () => {
      const users = [{ id: 1, email: 'a@a.ru' }] as User[];
      queryBuilder.getMany.mockResolvedValue(users);

      const result = await usersService.findAll({
        ...emptyFilters,
        limit: 20,
        offset: 0,
      });

      expect(result).toBe(users);
    });
  });
});
