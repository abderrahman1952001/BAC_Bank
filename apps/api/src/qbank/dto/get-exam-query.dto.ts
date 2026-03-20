import { Transform, TransformFnParams, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

function normalizeSujetNumber({
  value,
}: TransformFnParams): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export class GetExamQueryDto {
  @IsOptional()
  @Transform(normalizeSujetNumber)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2)
  sujetNumber?: number;
}
