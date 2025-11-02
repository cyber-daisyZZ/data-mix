/**
 * 字段类型枚举
 * 同时用于前端UI组件展示和后端数据库字段类型
 */
export enum FieldType {
  // 文本类型
  TEXT = 'text',                    // 前端：文本输入框 | 后端：VARCHAR/TEXT
  TEXTAREA = 'textarea',            // 前端：多行文本 | 后端：TEXT
  NUMBER = 'number',                // 前端：数字输入框 | 后端：INTEGER/BIGINT
  DECIMAL = 'decimal',              // 前端：小数输入框 | 后端：DECIMAL/NUMERIC
  BOOLEAN = 'boolean',              // 前端：复选框 | 后端：BOOLEAN
  SELECT = 'select',                // 前端：下拉选择 | 后端：VARCHAR
  MULTISELECT = 'multiselect',      // 前端：多选下拉 | 后端：JSONB（数组）
  CHECKBOX = 'checkbox',            // 前端：复选框组 | 后端：JSONB（数组）
  RADIO = 'radio',                  // 前端：单选按钮组 | 后端：VARCHAR
  
  // 日期时间类型
  DATE = 'date',                    // 前端：日期选择器 | 后端：DATE
  DATETIME = 'datetime',            // 前端：日期时间选择器 | 后端：TIMESTAMP
  TIME = 'time',                    // 前端：时间选择器 | 后端：TIME
  
  // 特殊类型
  EMAIL = 'email',                  // 前端：邮箱输入框 | 后端：VARCHAR
  URL = 'url',                      // 前端：URL输入框 | 后端：VARCHAR/TEXT
  UUID = 'uuid',                    // 前端：UUID输入框 | 后端：UUID
  JSON = 'json',                    // 前端：JSON编辑器 | 后端：JSONB
  ARRAY = 'array',                  // 前端：数组输入 | 后端：JSONB（数组）
}

/**
 * 类型映射：前端类型 -> 后端数据库类型
 */
export const TYPE_TO_DB_TYPE: Record<FieldType, string> = {
  [FieldType.TEXT]: 'VARCHAR(255)',
  [FieldType.TEXTAREA]: 'TEXT',
  [FieldType.NUMBER]: 'INTEGER',
  [FieldType.DECIMAL]: 'DECIMAL(10,2)',
  [FieldType.BOOLEAN]: 'BOOLEAN',
  [FieldType.SELECT]: 'VARCHAR(100)',
  [FieldType.MULTISELECT]: 'JSONB',
  [FieldType.CHECKBOX]: 'JSONB',
  [FieldType.RADIO]: 'VARCHAR(50)',
  [FieldType.DATE]: 'DATE',
  [FieldType.DATETIME]: 'TIMESTAMP',
  [FieldType.TIME]: 'TIME',
  [FieldType.EMAIL]: 'VARCHAR(255)',
  [FieldType.URL]: 'TEXT',
  [FieldType.UUID]: 'UUID',
  [FieldType.JSON]: 'JSONB',
  [FieldType.ARRAY]: 'JSONB',
};

/**
 * 类型映射：后端数据库类型 -> 前端类型（用于反向查找）
 */
export const DB_TYPE_TO_FRONTEND_TYPE: Record<string, FieldType> = {
  'VARCHAR': FieldType.TEXT,
  'TEXT': FieldType.TEXTAREA,
  'INTEGER': FieldType.NUMBER,
  'BIGINT': FieldType.NUMBER,
  'DECIMAL': FieldType.DECIMAL,
  'NUMERIC': FieldType.DECIMAL,
  'BOOLEAN': FieldType.BOOLEAN,
  'DATE': FieldType.DATE,
  'TIMESTAMP': FieldType.DATETIME,
  'TIMESTAMPTZ': FieldType.DATETIME,
  'TIME': FieldType.TIME,
  'UUID': FieldType.UUID,
  'JSON': FieldType.JSON,
  'JSONB': FieldType.JSON,
};

/**
 * 获取数据库类型字符串
 */
export function getDbType(fieldType: FieldType, length?: number): string {
  const baseType = TYPE_TO_DB_TYPE[fieldType];
  
  // 如果是 VARCHAR 类型，可以指定长度
  if (fieldType === FieldType.TEXT && length) {
    return `VARCHAR(${length})`;
  }
  
  return baseType;
}

/**
 * 从数据库类型获取前端类型
 */
export function getFrontendType(dbType: string): FieldType {
  const baseType = dbType.split('(')[0].toUpperCase();
  return DB_TYPE_TO_FRONTEND_TYPE[baseType] || FieldType.TEXT;
}

