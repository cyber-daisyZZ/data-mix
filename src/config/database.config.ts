export default () => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    globalPrefix: process.env.API_PREFIX || 'api/v1',
    swaggerPath: process.env.SWAGGER_PATH || 'swagger',
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'datamix',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

