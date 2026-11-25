// AWS Lambda の入口。API Gateway の HTTP API が JWT を検証し、プロキシ統合で受けたイベントを Express に渡す。
// Lambda では app.listen() を呼ばない。
const serverlessExpress = require('@codegenie/serverless-express');
const { createApp } = require('./app');
const { authenticate } = require('./authorization/authenticate');

const app = createApp({ authenticate });

exports.handler = serverlessExpress({ app });
