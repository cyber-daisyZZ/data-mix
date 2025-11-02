/**
 * 请求参数配置对象
 */
export interface RequestParam {
  /** 参数名 */
  key: string;
  /** 参数值 */
  value?: any;
  /** 参数类型 */
  type?: string;
  /** 默认值 */
  default?: string;
  /** 是否必填 */
  required?: boolean;
  /** 选项列表（用于 select、checkbox、radio 类型） */
  options?: string[];
}

