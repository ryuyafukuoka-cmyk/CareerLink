// Local development entry point (npm run dev:back). Uses the dev-only header login.
// The Lambda entry point is lambda.js; this file is never deployed.
const { createApp } = require('./app');
const { devAuthenticate } = require('./authorization/devAuthenticate');

const PORT = process.env.PORT || 3000;

createApp({ authenticate: devAuthenticate }).listen(PORT, () => {
    console.log(`CareerLink backend listening on http://localhost:${PORT}`);
});
