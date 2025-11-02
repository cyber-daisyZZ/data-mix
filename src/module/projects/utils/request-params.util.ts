/**
 * 将请求参数数组转换为对象格式（用于 HTTP 请求）
 */
export function convertRequestParamsToObject(
  params: Array<{
    key: string;
    value?: any;
    default?: string;
    type?: string;
  }>,
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const param of params) {
    // 使用 value，如果没有则使用 default
    const value = param.value !== undefined ? param.value : param.default;
    
    // 根据类型转换值
    if (value !== undefined && value !== null) {
      switch (param.type) {
        case 'number':
        case 'decimal':
          result[param.key] = Number(value);
          break;
        case 'boolean':
          result[param.key] =
            typeof value === 'string'
              ? value === 'true' || value === '1'
              : Boolean(value);
          break;
        case 'array':
        case 'json':
          result[param.key] =
            typeof value === 'string' ? JSON.parse(value) : value;
          break;
        default:
          result[param.key] = value;
      }
    }
  }
  
  return result;
}

/**
 * 合并两个请求参数数组
 */
export function mergeRequestParams(
  projectParams: Array<{
    key: string;
    value?: any;
    default?: string;
    type?: string;
  }>,
  taskParams?: Array<{
    key: string;
    value?: any;
    default?: string;
    type?: string;
  }>,
): Record<string, any> {
  const projectObj = convertRequestParamsToObject(projectParams);
  const taskObj = taskParams
    ? convertRequestParamsToObject(taskParams)
    : {};
  
  // 任务参数会覆盖项目参数
  return { ...projectObj, ...taskObj };
}

