// Production authentication: reads the claims that the API Gateway HTTP API JWT authorizer already
// verified (signature, expiry, issuer, audience). This app never parses or trusts a raw token.
// Sets req.claims; responds 401 when there are no usable claims.
const { unauthorized } = require('../common/errors');
const { buildClaims } = require('./claims');

// Gets the Lambda invoke event from @codegenie/serverless-express. Loaded lazily so the local
// server (which does not need the package at request time) never touches it.
function readGatewayClaims() {
    const { getCurrentInvoke } = require('@codegenie/serverless-express');
    const event = getCurrentInvoke()?.event;
    // HTTP API (payload v2): requestContext.authorizer.jwt.claims
    return event?.requestContext?.authorizer?.jwt?.claims ?? null;
}

function authenticate(req, res, next) {
    const claims = buildClaims(readGatewayClaims());
    if (!claims) return next(unauthorized());
    req.claims = claims;
    return next();
}

module.exports = { authenticate };
