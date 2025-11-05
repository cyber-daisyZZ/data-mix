import {
  IsString,
  IsUrl,
  IsIn,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType, TYPE_TO_DB_TYPE } from '../types/field-type.enum';

/**
 * 请求参数配置
 */
class RequestParamDto {
  @ApiProperty({ description: '参数名', example: 'page' })
  @IsString()
  key: string;

  @ApiProperty({
    description: '参数类型（前端UI类型，同时映射到后端数据库类型）',
    enum: Object.values(FieldType),
    example: FieldType.NUMBER,
  })
  @IsString()
  @IsIn(Object.values(FieldType))
  type: FieldType;

  @ApiPropertyOptional({ description: '默认值', example: '1' })
  @IsOptional()
  @IsString()
  default?: string;

  @ApiPropertyOptional({ description: '是否必填', default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: '选项列表（用于 select、checkbox、radio 类型）',
    example: ['option1', 'option2'],
  })
  @IsOptional()
  @IsArray()
  options?: string[];

  @ApiPropertyOptional({ description: '字段长度限制（用于 text 类型）', example: 255 })
  @IsOptional()
  length?: number;

  @ApiPropertyOptional({ description: '是否保存到数据库 如果需要保存到数据库 这个字段也会同步到后端数据库', default: false })
  @IsOptional()
  @IsBoolean()
  saveToDatabase?: boolean = false;
}

/**
 * 响应字段定义
 */
class FieldDefinitionDto {
  @ApiProperty({ description: '字段名', example: 'user_id' })
  @IsString()
  key: string;

  @ApiProperty({
    description: '字段类型（前端UI类型，自动映射到后端数据库类型）',
    enum: Object.values(FieldType),
    example: FieldType.TEXT,
  })
  @IsString()
  @IsIn(Object.values(FieldType))
  type: FieldType;

  @ApiPropertyOptional({ description: '是否可为空', default: true })
  @IsOptional()
  @IsBoolean()
  nullable?: boolean;

  @ApiPropertyOptional({ description: '是否为主键', default: false })
  @IsOptional()
  @IsBoolean()
  primary?: boolean;

  @ApiPropertyOptional({ description: '默认值', example: 'NOW()' })
  @IsOptional()
  @IsString()
  default?: string;

  @ApiPropertyOptional({ description: '是否唯一', default: false })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;

  @ApiPropertyOptional({ description: '字段长度（用于 text 类型）', example: 255 })
  @IsOptional()
  length?: number;
}

export class CreateProjectDto {
  @ApiProperty({ description: '项目名称', example: '用户数据爬取' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'API地址',
    example: 'https://api.example.com/users',
  })
  @IsUrl()
  api_url: string;

  @ApiProperty({
    description: 'HTTP请求方法',
    enum: ['GET', 'POST', 'PUT', 'DELETE'],
    example: 'GET',
  })
  @IsIn(['GET', 'POST', 'PUT', 'DELETE'])
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  @ApiProperty({
    description: '请求参数配置数组',
    type: [RequestParamDto],
    example: [
      { key: 'page', type: 'number', default: '1', required: false },
      { key: 'pageSize', type: 'number', default: '100', required: false },
      { key: 'status', type: 'select', options: ['active', 'inactive'], required: false },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestParamDto)
  request_params: RequestParamDto[];

  @ApiProperty({
    description: '返回数据结构定义（字段配置）',
    type: [FieldDefinitionDto],
    example: [
      {
        key: 'user_id',
        type: 'text',
        nullable: false,
        primary: true,
        length: 255,
      },
      {
        key: 'username',
        type: 'text',
        nullable: false,
        length: 100,
      },
      {
        key: 'age',
        type: 'number',
        nullable: true,
      },
      {
        key: 'is_active',
        type: 'boolean',
        nullable: false,
        default: 'true',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldDefinitionDto)
  response_structure: FieldDefinitionDto[];

  @ApiProperty({
    description: '数据层级 比如目标数据在接口返回对象的data.list中 则填写 ["data", "list"]',
    example: ['data', 'list'],
  })
  @IsArray()
  @IsString({ each: true })
  target_chain: string[];
}

