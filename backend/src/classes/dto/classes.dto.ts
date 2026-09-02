import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';

export class CreateClassDto {
  @IsInt()
  @Min(1)
  @Max(11)
  number!: number;

  @IsString()
  @Length(1, 1)
  @Matches(/^[А-ЯЁ]$/, { message: 'Буква класса — одна прописная русская буква' })
  letter!: string;
}

export class StudentInput {
  @IsString()
  @Length(1, 60)
  lastName!: string;

  @IsString()
  @Length(1, 60)
  firstName!: string;
}

export class ReplaceStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentInput)
  students!: StudentInput[];
}

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  @Length(1, 60)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 60)
  firstName?: string;
}

export class PromoteClassDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  number?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[А-ЯЁ]$/)
  letter?: string;
}
