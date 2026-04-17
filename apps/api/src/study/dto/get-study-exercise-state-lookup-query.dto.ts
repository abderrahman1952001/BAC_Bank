import { Transform, TransformFnParams } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from 'class-validator';

function normalizeUuidList({ value }: TransformFnParams): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const list = Array.isArray(value) ? value : [value];

  const normalized = list
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? Array.from(new Set(normalized)) : undefined;
}

export class GetStudyExerciseStateLookupQueryDto {
  @IsOptional()
  @Transform(normalizeUuidList)
  @IsArray()
  @ArrayMaxSize(120)
  @IsUUID(undefined, { each: true })
  exerciseNodeIds?: string[];
}
