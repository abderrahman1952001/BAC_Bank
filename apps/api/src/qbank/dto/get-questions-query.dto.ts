import { SessionType } from '@prisma/client';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

function normalizeUppercaseCode({
  value,
}: TransformFnParams): string | undefined {
  return typeof value === 'string' ? value.trim().toUpperCase() : undefined;
}

function normalizeText({ value }: TransformFnParams): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

export class GetQuestionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2008)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsEnum(SessionType)
  session?: SessionType;

  @IsOptional()
  @IsString()
  @Transform(normalizeUppercaseCode)
  subjectCode?: string;

  @IsOptional()
  @IsString()
  @Transform(normalizeUppercaseCode)
  streamCode?: string;

  @IsOptional()
  @IsString()
  @Transform(normalizeUppercaseCode)
  topicCode?: string;

  @IsOptional()
  @IsString()
  @Transform(normalizeText)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
