import { Transform, TransformFnParams } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : '',
  )
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
