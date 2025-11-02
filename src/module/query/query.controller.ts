import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QueryService } from './query.service';
import { QueryDataDto } from './dto/query-data.dto';

@ApiTags('query')
@Controller('query')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post()
  @ApiOperation({ summary: '查询项目数据' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  queryData(@Body() queryDto: QueryDataDto) {
    return this.queryService.queryProjectData(queryDto);
  }

  @Get('versions/:projectId')
  @ApiOperation({ summary: '获取项目的所有可用版本' })
  @ApiParam({ name: 'projectId', description: '项目ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '项目不存在' })
  getVersions(@Param('projectId') projectId: string) {
    return this.queryService.getProjectVersions(projectId);
  }
}

