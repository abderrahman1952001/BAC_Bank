import { Transform, TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : '',
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(64)
  username!: string;

  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : '',
  )
  @IsString()
  @IsNotEmpty()
  streamCode!: string;
}
