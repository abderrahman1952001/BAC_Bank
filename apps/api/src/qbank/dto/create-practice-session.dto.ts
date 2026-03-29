import { SessionType } from '@prisma/client';
import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SESSION_YEAR_MAX, SESSION_YEAR_MIN } from '../session-year-range';

function normalizeCodeList({ value }: TransformFnParams): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const list = Array.isArray(value) ? value : [value];

  const normalized = list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function normalizeSessionTypeList({
  value,
}: TransformFnParams): SessionType[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const list = Array.isArray(value) ? value : [value];

  const normalized = list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toUpperCase())
    .filter((item): item is SessionType =>
      (Object.values(SessionType) as string[]).includes(item),
    );

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function normalizeYearList({ value }: TransformFnParams): number[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const list = Array.isArray(value) ? value : [value];

  const normalized = list
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

function normalizeText({ value }: TransformFnParams): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export class CreatePracticeSessionDto {
  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  title?: string;

  @IsOptional()
  @Transform(normalizeYearList)
  @IsArray()
  @ArrayMaxSize(18)
  @IsInt({ each: true })
  @Min(SESSION_YEAR_MIN, { each: true })
  @Max(SESSION_YEAR_MAX, { each: true })
  years?: number[];

  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsString()
  @IsNotEmpty()
  subjectCode!: string;

  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : undefined,
  )
  @IsString()
  streamCode?: string;

  @IsOptional()
  @Transform(normalizeCodeList)
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  streamCodes?: string[];

  @IsOptional()
  @Transform(normalizeCodeList)
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  topicCodes?: string[];

  @IsOptional()
  @Transform(normalizeSessionTypeList)
  @IsArray()
  @ArrayMaxSize(2)
  @IsEnum(SessionType, { each: true })
  sessionTypes?: SessionType[];

  @IsOptional()
  @Transform(normalizeText)
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  exerciseCount?: number;
}
