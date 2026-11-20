import { IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchSupportRequestsQueryDto {
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
