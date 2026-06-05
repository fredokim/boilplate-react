import { Type } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';
import { ValidateNested } from 'class-validator';

export class UserDto {
  @IsString()
  id = '';

  @IsEmail()
  email = '';

  @IsString()
  name = '';

  @IsString()
  role = '';
}

export class UserListItemDto extends UserDto {}

export class UserListDto {
  @ValidateNested({ each: true })
  @Type(() => UserListItemDto)
  items: UserListItemDto[] = [];
}
