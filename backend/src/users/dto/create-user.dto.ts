import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

/** Допустимые символы контактного телефона (спецификация, раздел 6.1). */
const PHONE_REGEX = /^[+0-9 ()-]+$/;

/** Тело запроса POST /api/admin/users. */
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, {
    message: 'contactPhone может содержать только символы +0-9 ()-',
  })
  contactPhone?: string;

  @IsIn(['client', 'admin', 'manager'])
  role: UserRole;
}
