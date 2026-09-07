import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁё-]+$/, { message: 'Фамилия: только русские буквы и дефис' })
  lastName!: string;

  @IsString()
  @Length(2, 60)
  @Matches(/^[А-Яа-яЁё-]+$/, { message: 'Имя: только русские буквы и дефис' })
  firstName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;

  /** Второй администратор школы: завуч, который тоже заводит учителей. */
  @IsOptional()
  @IsString()
  role?: 'TEACHER' | 'SCHOOL_ADMIN';
}

export class UpdateTeacherDto {
  @IsOptional()
  @IsString()
  @Length(3, 120)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  subject?: string;
}
