import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  api_url: string;

  @Column({ type: 'varchar', length: 10 })
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  @Column({ type: 'jsonb' })
  request_params: Array<{
    key: string;
    type: string; // FieldType 枚举值
    default?: string;
    required?: boolean;
    options?: string[]; // 用于 select、checkbox、radio
    length?: number; // 用于 text 类型
    saveToDatabase?: boolean; // 是否保存到数据库
  }>;

  @Column({ type: 'jsonb' })
  response_structure: Array<{
    key: string;
    type: string; // FieldType 枚举值
    nullable?: boolean;
    primary?: boolean;
    default?: string;
    unique?: boolean;
    length?: number; // 用于 text 类型
  }>;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}

