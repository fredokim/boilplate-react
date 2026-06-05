import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ApiErrorDto {
  @IsString()
  code = '';

  @IsString()
  message = '';
}

export function createApiEnvelopeDto<TData extends object>(DataDto: new () => TData) {
  class ApiEnvelopeDto {
    @IsBoolean()
    success = false;

    @ValidateNested()
    @Type(() => DataDto)
    @IsOptional()
    data?: TData;

    @ValidateNested()
    @Type(() => ApiErrorDto)
    @IsOptional()
    error?: ApiErrorDto;
  }

  return ApiEnvelopeDto;
}
