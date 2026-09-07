import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';

export class RegisterSchoolDto {
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

  /** Без согласия с документами регистрация невозможна: 152-ФЗ. */
  @IsBoolean()
  acceptTerms!: boolean;
}

export class UpdateSchoolDto {
  @IsOptional()
  @IsString()
  @Length(3, 200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;
}

export class CreateSchoolDto {
  @IsString()
  @Length(3, 200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsString()
  @Length(2, 60)
  adminLastName!: string;

  @IsString()
  @Length(2, 60)
  adminFirstName!: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  /** На сколько месяцев открыть доступ без оплаты. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class ExtendSchoolDto {
  @IsInt()
  @Min(1)
  @Max(60)
  months!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
