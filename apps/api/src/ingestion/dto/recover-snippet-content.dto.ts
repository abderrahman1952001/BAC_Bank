import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class CropBoxDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;

  @IsNumber()
  width!: number;

  @IsNumber()
  height!: number;
}

export class RecoverSnippetContentDto {
  @IsString()
  source_page_id!: string;

  @ValidateNested()
  @Type(() => CropBoxDto)
  crop_box!: CropBoxDto;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  caption?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
