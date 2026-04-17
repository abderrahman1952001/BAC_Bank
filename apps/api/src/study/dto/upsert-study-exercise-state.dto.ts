import { IsBoolean, IsOptional } from 'class-validator';

export class UpsertStudyExerciseStateDto {
  @IsOptional()
  @IsBoolean()
  bookmarked?: boolean;

  @IsOptional()
  @IsBoolean()
  flagged?: boolean;
}
