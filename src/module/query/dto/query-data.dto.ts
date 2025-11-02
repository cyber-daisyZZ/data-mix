import {
  IsUUID,
  IsOptional,
  IsArray,
  IsString,
  IsIn,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QueryFilterDto {
  @ApiProperty({ description: '字段名', example: 'username' })
  @IsString()
  field: string;

  @ApiProperty({
    description: '操作符',
    enum: ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'],
    example: 'LIKE',
  })
  @IsIn(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'])
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN';

  @ApiPropertyOptional({
    description: '查询值（用于 =, !=, >, <, >=, <=, LIKE 操作符）',
    example: '张%',
  })
  @IsOptional()
  value?: any;

  @ApiPropertyOptional({
    description: '查询值数组（用于 IN 操作符）',
    example: ['active', 'pending'],
  })
  @IsOptional()
  @IsArray()
  values?: any[];
}

export class QueryDataDto {
  @ApiProperty({
    description: '项目ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({
    description: '数据版本（可选，不指定则使用最新版本）',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;

  @ApiPropertyOptional({
    description: '筛选条件',
    type: [QueryFilterDto],
    example: [
      {
        field: 'username',
        operator: 'LIKE',
        value: '张%',
      },
      {
        field: 'age',
        operator: '>=',
        value: 18,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryFilterDto)
  filters?: QueryFilterDto[];

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'created_at',
  })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'ASC',
  })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({
    description: '每页条数',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: '偏移量（分页）',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

