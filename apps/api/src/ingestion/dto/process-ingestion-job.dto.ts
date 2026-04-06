import { Allow, IsOptional } from 'class-validator';

export class ProcessIngestionJobDto {
  @IsOptional()
  @Allow()
  force_reprocess?: unknown;

  @IsOptional()
  @Allow()
  replace_existing?: unknown;

  @IsOptional()
  @Allow()
  skip_extraction?: unknown;
}
