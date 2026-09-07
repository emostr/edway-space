import { IsBoolean, IsEmail, IsOptional, IsString, Length, MaxLength, Matches } from 'class-validator';

export class PurchaseDto {
  @IsString()
  @Length(3, 200)
  schoolName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁё-]+$/, { message: 'Фамилия: только русские буквы и дефис' })
  lastName!: string;

  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁё-]+$/, { message: 'Имя: только русские буквы и дефис' })
  firstName!: string;

  @IsEmail({}, { message: 'Проверьте адрес почты' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsBoolean()
  acceptTerms!: boolean;
}

export class CheckoutDto {
  @IsOptional()
  @IsEmail()
  email?: string;
}
