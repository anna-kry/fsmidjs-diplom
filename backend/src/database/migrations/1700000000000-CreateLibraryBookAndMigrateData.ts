import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Миграция для перехода на новую модель LibraryBook:
 * 1. Создаёт таблицу library_books
 * 2. Переносит данные из books (libraryId, totalCopies, availableCopies)
 * 3. Удаляет legacy-поля из books
 */
export class CreateLibraryBookAndMigrateData1700000000000
  implements MigrationInterface
{
  name = 'CreateLibraryBookAndMigrateData1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Создаём таблицу library_books
    await queryRunner.query(`
      CREATE TABLE "library_books" (
        "id" SERIAL NOT NULL,
        "bookId" integer NOT NULL,
        "libraryId" integer NOT NULL,
        "totalCopies" integer NOT NULL DEFAULT 1,
        "availableCopies" integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_library_books" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_library_books_book_library" UNIQUE ("bookId", "libraryId"),
        CONSTRAINT "FK_library_books_book" FOREIGN KEY ("bookId") REFERENCES "books" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_library_books_library" FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE,
        CONSTRAINT "chk_library_books_total_copies" CHECK ("totalCopies" >= 1),
        CONSTRAINT "chk_library_books_available_copies" CHECK ("availableCopies" >= 0 AND "availableCopies" <= "totalCopies")
      )
    `);

    // 2. Создаём индексы
    await queryRunner.query(`
      CREATE INDEX "idx_library_books_book" ON "library_books" ("bookId")
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_library_books_library" ON "library_books" ("libraryId")
    `);

    // 3. Переносим данные из books в library_books
    // Для каждой книги с заполненным libraryId создаём запись в library_books
    await queryRunner.query(`
      INSERT INTO "library_books" ("bookId", "libraryId", "totalCopies", "availableCopies", "createdAt", "updatedAt")
      SELECT "id", "libraryId", "totalCopies", "availableCopies", "createdAt", "updatedAt"
      FROM "books"
      WHERE "libraryId" IS NOT NULL
    `);

    // 4. Удаляем legacy-поля из books
    // Сначала внешний ключ на libraries
    await queryRunner.query(`
      ALTER TABLE "books" DROP CONSTRAINT IF EXISTS "FK_books_library"
    `);
    
    // Удаляем колонки
    await queryRunner.query(`
      ALTER TABLE "books" DROP COLUMN IF EXISTS "libraryId"
    `);
    await queryRunner.query(`
      ALTER TABLE "books" DROP COLUMN IF EXISTS "totalCopies"
    `);
    await queryRunner.query(`
      ALTER TABLE "books" DROP COLUMN IF EXISTS "availableCopies"
    `);
    await queryRunner.query(`
      ALTER TABLE "books" DROP COLUMN IF EXISTS "isAvailable"
    `);

    // 5. Удаляем индекс по libraryId из books (если остался)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_books_library"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Восстанавливаем колонки в books
    await queryRunner.query(`
      ALTER TABLE "books" ADD COLUMN "libraryId" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "books" ADD COLUMN "totalCopies" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "books" ADD COLUMN "availableCopies" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "books" ADD COLUMN "isAvailable" boolean NOT NULL DEFAULT true
    `);

    // Восстанавливаем данные из первой library_books записи для каждой книги
    await queryRunner.query(`
      UPDATE "books" b
      SET "libraryId" = lb."libraryId",
          "totalCopies" = lb."totalCopies",
          "availableCopies" = lb."availableCopies",
          "isAvailable" = (lb."availableCopies" > 0)
      FROM (
        SELECT DISTINCT ON ("bookId") "bookId", "libraryId", "totalCopies", "availableCopies"
        FROM "library_books"
        ORDER BY "bookId", "id"
      ) lb
      WHERE b."id" = lb."bookId"
    `);

    // Восстанавливаем внешний ключ и индекс
    await queryRunner.query(`
      ALTER TABLE "books" ADD CONSTRAINT "FK_books_library" 
      FOREIGN KEY ("libraryId") REFERENCES "libraries" ("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_books_library" ON "books" ("libraryId")
    `);

    // Удаляем таблицу library_books
    await queryRunner.query(`DROP TABLE IF EXISTS "library_books"`);
  }
}