// AWS Lambda entry point. API Gateway (HTTP API, JWT authorizer, proxy integration) -> this
// handler -> Express. app.listen() is never called here.
const serverlessExpress = require('@codegenie/serverless-express');
const { createApp } = require('./app');
const { authenticate } = require('./authorization/authenticate');

const app = createApp({ authenticate });

exports.handler = serverlessExpress({ app });
