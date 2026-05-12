import { Transform, TransformFnParams } from 'class-transformer';
import { IsEnum } from 'class-validator';
import { FlashcardReviewRating } from '@prisma/client';

export class ReviewFlashcardDto {
  @Transform(({ value }: TransformFnParams) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(FlashcardReviewRating)
  rating!: FlashcardReviewRating;
}
