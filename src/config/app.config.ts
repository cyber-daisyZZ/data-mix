export default () => ({
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    globalPrefix: process.env.API_PREFIX || 'api/v1',
    swaggerPath: process.env.SWAGGER_PATH || 'swagger',
  }
});

