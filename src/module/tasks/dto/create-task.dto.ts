import { IsUUID, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestParam } from '../types/request-param.interface';

class RequestParamDto implements RequestParam {
  @ApiProperty({ description: '参数名', example: 'page' })
  key: string;

  @ApiPropertyOptional({ description: '参数值', example: 1 })
  value?: any;

  @ApiPropertyOptional({ description: '参数类型', example: 'number' })
  type?: string;

  @ApiPropertyOptional({ description: '默认值', example: '1' })
  default?: string;

  @ApiPropertyOptional({ description: '是否必填', default: false })
  required?: boolean;

  @ApiPropertyOptional({
    description: '选项列表（用于 select、checkbox、radio 类型）',
    example: ['option1', 'option2'],
  })
  options?: string[];
}

export class CreateTaskDto {
  @ApiProperty({
    description: '项目ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  project_id: string;

  @ApiPropertyOptional({
    description: '请求参数配置数组（本次任务的具体参数，会与项目配置的参数合并）',
    type: [RequestParamDto],
    example: [
      { key: 'page', value: 1, type: 'number' },
      { key: 'pageSize', value: 50, type: 'number' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestParamDto)
  request_params?: RequestParam[];
}

