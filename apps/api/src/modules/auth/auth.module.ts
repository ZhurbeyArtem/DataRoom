import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Саме registerAsync, а не register: синхронний варіант читає process.env
    // у момент імпорту модуля, тобто ДО того, як ConfigModule завантажить .env.
    // Секрет виявився б undefined, і кожна видача токена падала б у 500.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // getOrThrow валить застосунок на старті, якщо секрету немає, —
        // це краще, ніж дізнатися про це з першої помилки користувача.
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // @nestjs/jwt приймає не будь-який рядок, а формат ms: '15m', '7d'.
          expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
