import { Type } from 'class-transformer';
import { IsArray, IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';

export class AuthUserDto {
  @IsString()
  id = '';

  @IsEmail()
  email = '';

  @IsString()
  name = '';

  @IsArray()
  @IsString({ each: true })
  permissions: string[] = [];
}

export class SessionDto {
  @ValidateNested()
  @Type(() => AuthUserDto)
  user = new AuthUserDto();
}

export class LoginResultDto {
  @IsString()
  accessToken = '';

  @ValidateNested()
  @Type(() => AuthUserDto)
  user = new AuthUserDto();
}

export class LoginRequestDto {
  @IsEmail()
  email = '';

  @IsString()
  @MinLength(8)
  password = '';
}
