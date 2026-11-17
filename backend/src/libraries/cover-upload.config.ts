import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';

/** Имя поля с файлом в multipart-форме (спецификация, раздел 6.3). */
export const COVER_FIELD_NAME = 'coverImage';

/** Максимальный размер обложки — 2 МБ. */
export const MAX_COVER_SIZE_BYTES = 2 * 1024 * 1024;

/** Разрешённые типы файлов обложки. */
export const ALLOWED_COVER_MIME_TYPES: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Файл обложки после multer (по умолчанию multer держит файл в памяти). */
export interface CoverFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Проверяет тип и размер файла по правилам спецификации.
 * Ошибки валидации — HTTP 400.
 */
export function validateCoverFile(file: CoverFile): void {
  if (!ALLOWED_COVER_MIME_TYPES.includes(file.mimetype)) {
    throw new BadRequestException(
      `Неподдерживаемый тип файла обложки: ${file.mimetype}. Допустимы: ${ALLOWED_COVER_MIME_TYPES.join(', ')}`,
    );
  }

  if (file.size > MAX_COVER_SIZE_BYTES) {
    throw new BadRequestException('Файл обложки больше 2 МБ');
  }
}

/**
 * Сохраняет обложку в UPLOADS_DIR и возвращает путь `/uploads/<uuid>.<ext>`.
 *
 * Имя файла генерируется (uuid + расширение из mime-типа) — имя,
 * присланное клиентом, в файловой системе не используется.
 */
export async function saveCoverFile(
  uploadsDir: string,
  file: CoverFile,
): Promise<string> {
  validateCoverFile(file);

  const extension = EXTENSION_BY_MIME[file.mimetype];
  const filename = `${randomUUID()}.${extension}`;

  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, filename), file.buffer);

  return `/uploads/${filename}`;
}

/**
 * Удаляет файл обложки. Если файла нет — это не ошибка.
 *
 * Безопасность: из сохранённого пути берётся только basename,
 * поэтому запись вида `/uploads/../../etc/passwd` не покинет каталог.
 */
export async function removeCoverFile(
  uploadsDir: string,
  coverPath: string | null | undefined,
): Promise<void> {
  if (!coverPath || !coverPath.startsWith('/uploads/')) {
    return;
  }

  const fullPath = join(resolve(uploadsDir), basename(coverPath));

  try {
    await unlink(fullPath);
  } catch {
    // Файл уже удалён или недоступен — продолжаем работу.
  }
}
