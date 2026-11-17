import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/** Создание библиотеки: name и address обязательны, description нет. */
export class CreateLibraryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;
}

/** Обновление библиотеки: все поля необязательны (спецификация, раздел 6.3). */
export class UpdateLibraryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description: string;
}
