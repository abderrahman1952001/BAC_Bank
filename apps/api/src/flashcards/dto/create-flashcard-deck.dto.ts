import { Transform, TransformFnParams } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: TransformFnParams): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function trimOptionalString({
  value,
}: TransformFnParams): string | null | undefined {
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
