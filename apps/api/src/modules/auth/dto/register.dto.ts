import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'artem@acme.com' })
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  // MaxLength(72) is not cosmetic: bcrypt silently truncates anything past
  // 72 bytes, so without the limit a longer password would be verified by
  // its first 72 characters only.
  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Artem' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;
}
