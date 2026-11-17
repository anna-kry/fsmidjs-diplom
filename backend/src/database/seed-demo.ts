import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { Book } from '../libraries/entities/book.entity';
import { Library } from '../libraries/entities/library.entity';

/** Одна книга демо-каталога (без обложек — реальные изображения не нужны). */
interface DemoBook {
  title: string;
  author: string;
  year: number;
  description: string;
  totalCopies: number;
}

/** Одна библиотека демо-каталога с книгами. */
interface DemoLibrary {
  name: string;
  address: string;
  description: string;
  books: DemoBook[];
}

/**
 * Демо-данные: 3 библиотеки и 15 книг.
 * Запуск: npm run seed:demo (см. backend/package.json).
 */
const DEMO_LIBRARIES: DemoLibrary[] = [
  {
    name: 'Центральная городская библиотека им. Н. А. Некрасова',
    address: 'ул. Советская, 12',
    description: 'Старейшая библиотека города: художественная литература, периодика и зал редких изданий.',
    books: [
      {
        title: 'Мастер и Маргарита',
        author: 'Михаил Булгаков',
        year: 1967,
        description: 'Роман о визите Воланда в Москву и о вечной борьбе добра и зла.',
        totalCopies: 3,
      },
      {
        title: 'Война и мир',
        author: 'Лев Толстой',
        year: 1869,
        description: 'Эпопея о судьбах дворянских семей в эпоху наполеоновских войн.',
        totalCopies: 2,
      },
      {
        title: 'Преступление и наказание',
        author: 'Фёдор Достоевский',
        year: 1866,
        description: 'Роман о бывшем студенте Раскольникове и его теории о праве на преступление.',
        totalCopies: 4,
      },
      {
        title: 'Стихотворения и поэмы',
        author: 'Александр Пушкин',
        year: 1978,
        description: 'Избранные произведения от «Руслана и Людмылы» до поздней лирики.',
        totalCopies: 5,
      },
      {
        title: 'Герой нашего времени',
        author: 'Михаил Лермонтов',
        year: 1840,
        description: 'Первый русский психологический роман о Печорине.',
        totalCopies: 2,
      },
    ],
  },
  {
    name: 'Библиотека «Северная звезда»',
    address: 'проспект Мира, 45',
    description: 'Семейная библиотека с детским отделом и клубом любителей фантастики.',
    books: [
      {
        title: 'Маленький принц',
        author: 'Антуан де Сент-Экзюпери',
        year: 1943,
        description: 'Притча о дружбе, ответственности и главных ценностях жизни.',
        totalCopies: 3,
      },
      {
        title: '1984',
        author: 'Джордж Оруэлл',
        year: 1949,
        description: 'Антиутопия о мире тотального контроля и надзора.',
        totalCopies: 3,
      },
      {
        title: 'Убийство в «Восточном экспрессе»',
        author: 'Агата Кристи',
        year: 1934,
        description: 'Детектив с Эркюлем Пуаро: преступление в застрявшем поезде.',
        totalCopies: 2,
      },
      {
        title: 'Гарри Поттер и философский камень',
        author: 'Джоан Роулинг',
        year: 1997,
        description: 'Первая книга о мальчике-волшебнике и его учёбе в Хогвартсе.',
        totalCopies: 4,
      },
      {
        title: 'Дюна',
        author: 'Фрэнк Герберт',
        year: 1965,
        description: 'Космическая опера о пустынной планете Арракис и борьбе за специю.',
        totalCopies: 2,
      },
    ],
  },
  {
    name: 'Научная библиотека «Полюс»',
    address: 'ул. Академическая, 7',
    description: 'Научно-популярный фонд: астрономия, биология, математика и история науки.',
    books: [
      {
        title: 'Космос',
        author: 'Карл Саган',
        year: 1980,
        description: 'Путешествие по Вселенной: от вечности до зарождения жизни.',
        totalCopies: 2,
      },
      {
        title: 'Геном. Автобиография вида в 23 главах',
        author: 'Ричард Докинз',
        year: 2000,
        description: 'История человечества, рассказанная генами и эволюцией.',
        totalCopies: 2,
      },
      {
        title: 'Астрофизика для нетерпеливых',
        author: 'Нил Деграсс Тайсон',
        year: 2017,
        description: 'Понятное введение в устройство Вселенной для читателя без физического образования.',
        totalCopies: 3,
      },
      {
        title: 'Думай как математик',
        author: 'Карол Дверк',
        year: 2017,
        description: 'Как разбираться в числах, вероятностях и логике в повседневной жизни.',
        totalCopies: 2,
      },
      {
        title: 'Sapiens. Краткая история человечества',
        author: 'Юваль Ной Харари',
        year: 2011,
        description: 'Как Homo sapiens стал хозяином планеты: от огненного заката до цифровой эры.',
        totalCopies: 3,
      },
    ],
  },
];

/**
 * Создаёт демо-библиотеки и книги.
 * Повторный запуск безопасен: существующие по названию записи пропускаются,
 * пользователи и данные авторизации не затрагиваются.
 */
async function seedDemoData(app: Awaited<ReturnType<typeof NestFactory.create>>): Promise<void> {
  const librariesRepository = app.get(getRepositoryToken(Library), {
    strict: false,
  });
  const booksRepository = app.get(getRepositoryToken(Book), {
    strict: false,
  });

  let createdLibraries = 0;
  let createdBooks = 0;
  let skippedBooks = 0;

  for (const data of DEMO_LIBRARIES) {
    let library = await librariesRepository.findOne({
      where: { name: data.name },
    });

    if (!library) {
      library = await librariesRepository.save(
        librariesRepository.create({
          name: data.name,
          address: data.address,
          description: data.description,
        }),
      );
      createdLibraries += 1;
    }

    for (const bookData of data.books) {
      const existing = await booksRepository.findOne({
        where: {
          title: bookData.title,
          author: bookData.author,
          libraryId: library.id,
        },
      });

      if (existing) {
        skippedBooks += 1;
        continue;
      }

      // Обложек у демо-книг нет — фронтенд показывает плейсхолдер.
      await booksRepository.save(
        booksRepository.create({
          title: bookData.title,
          author: bookData.author,
          year: bookData.year,
          description: bookData.description,
          library,
          libraryId: library.id,
          totalCopies: bookData.totalCopies,
          availableCopies: bookData.totalCopies,
          isAvailable: bookData.totalCopies > 0,
          coverImage: null,
        }),
      );
      createdBooks += 1;
    }
  }

  console.log(
    `Демо-данные: создано библиотек ${createdLibraries}, книг ${createdBooks}; ` +
      `уже существовало книг ${skippedBooks}.`,
  );
}

async function bootstrap(): Promise<void> {
  // AppModule поднимается без listen(): HTTP-сервер не нужен, а конфигурация,
  // сессии и статические каталоги инициализируются как обычно.
  const app = await NestFactory.create(AppModule, { logger: ['error'] });

  try {
    await app.init();
    await seedDemoData(app);
    await app.close();
  } catch (error) {
    console.error('Не удалось создать демо-данные:', error);
    await app.close();
    process.exit(1);
  }
}

bootstrap();
