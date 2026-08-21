import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'artem@acme.com' })
  @IsEmail({}, { message: 'Вкажіть коректний email' })
  email!: string;

  // MaxLength(72) не косметичний: bcrypt мовчки обрізає все після 72 байтів,
  // і без обмеження довший пароль перевірявся б лише за першими 72 символами.
  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Пароль має бути щонайменше 8 символів' })
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Артем' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
