import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  username!: string;

  @IsString()
  @MinLength(1)
  streamCode!: string;
}
