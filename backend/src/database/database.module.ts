import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { SeedService } from './seed.service';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('app.postgres.host'),
        port: config.get<number>('app.postgres.port'),
        username: config.get<string>('app.postgres.user'),
        password: config.get<string>('app.postgres.password'),
        database: config.get<string>('app.postgres.database'),
        synchronize: config.get<boolean>('app.db.synchronize'),
        logging: false,
        entities: [],
        autoLoadEntities: true,
        migrations: [join(__dirname, 'migrations', '*.ts')],
        migrationsRun: false,
      }),
    }),
    UsersModule,
  ],
  providers: [SeedService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
