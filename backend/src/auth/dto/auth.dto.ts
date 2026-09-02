import { IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁёA-Za-z-]+$/, { message: 'Фамилия: только буквы и дефис' })
  lastName!: string;

  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁёA-Za-z-]+$/, { message: 'Имя: только буквы и дефис' })
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @MaxLength(128)
  password!: string;
}

export class LoginDto {
  @IsString()
  @Length(3, 60)
  login!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'Пароль должен быть не короче 8 символов' })
  @MaxLength(128)
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;
}
