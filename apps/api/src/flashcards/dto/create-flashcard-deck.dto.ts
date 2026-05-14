import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trimString(params: TransformFnParams): string | undefined {
  const value = params.value as unknown;
  return typeof value === 'string' ? value.trim() : undefined;
}

function trimOptionalString(
  params: TransformFnParams,
): string | null | undefined {
  const value = params.value as unknown;

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export class CreateFlashcardDeckDto {
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @Transform(trimOptionalString)
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}
