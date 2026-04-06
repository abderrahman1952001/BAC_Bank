import { IsOptional, IsString } from 'class-validator';

export class RecoverAssetContentDto {
  @IsOptional()
  @IsString()
  mode?: string;
}
