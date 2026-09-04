import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class KpiDataDto {
  @IsIn(['kpi'])
  kind = 'kpi' as const;

  @IsString()
  label = '';

  @IsNumber()
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  trend?: string;
}

export class SeriesPointDto {
  @IsString()
  label = '';

  @IsNumber()
  value = 0;
}

export class SeriesDataDto {
  @IsIn(['series'])
  kind = 'series' as const;

  @ValidateNested({ each: true })
  @Type(() => SeriesPointDto)
  points: SeriesPointDto[] = [];
}

export class TableColumnDto {
  @IsIn(['event', 'owner', 'status'])
  key: 'event' | 'owner' | 'status' = 'event';

  @IsString()
  label = '';
}

export class TableRowDto {
  @IsString()
  id = '';

  @IsString()
  event = '';

  @IsString()
  owner = '';

  @IsString()
  status = '';
}

export class TableDataDto {
  @IsIn(['table'])
  kind = 'table' as const;

  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  columns: TableColumnDto[] = [];

  @ValidateNested({ each: true })
  @Type(() => TableRowDto)
  rows: TableRowDto[] = [];
}
