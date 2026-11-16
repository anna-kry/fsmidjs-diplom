import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { ClientRegisterController } from './client-register.controller';
import { LocalStrategy } from './local.strategy';
import { SessionSerializer } from './session.serializer';

@Module({
  imports: [PassportModule, UsersModule],
  controllers: [AuthController, ClientRegisterController],
  providers: [LocalStrategy, SessionSerializer],
})
export class AuthModule {}
