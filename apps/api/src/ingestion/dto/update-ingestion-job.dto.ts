import { Allow, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateIngestionJobDto {
  @IsOptional()
  @Allow()
  draft_json?: unknown;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  review_notes?: string | null;
}
