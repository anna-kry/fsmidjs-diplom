import { IsEmail, IsString } from 'class-validator';

/** Тело запроса POST /api/auth/login. */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
