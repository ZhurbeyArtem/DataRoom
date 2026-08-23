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
    // registerAsync rather than register: the synchronous variant reads
    // process.env at module import time, i.e. BEFORE ConfigModule loads .env.
    // The secret would be undefined and every token issue would 500.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // getOrThrow crashes the app at boot when the secret is missing —
        // better than learning about it from the first user-facing error.
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // @nestjs/jwt accepts the ms format specifically: '15m', '7d'.
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
