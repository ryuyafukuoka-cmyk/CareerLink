# Dev Progress

Frontend (as of 11/16): Week 1 done; app shell and Wed 11/18 auth/home screens tested OK.
Company screens (SC-04-01 / 02 / 03) are written and wired in `screenElements.jsx`; walk through them as
student / instructor / admin (delete is admin only, 409 re-confirm) before ticking them off.

11/16: Week 3 mock server for rounds written (NOT yet run): `backend/mock-server/routes/rounds.js`
(RD-01 to RD-06), 30-second cooldown in `store.js` (`assertCooldown` / `markCreated`, kind `round`;
R-01 will use kind `record`), `isRealDate` in `validators.js`, messages E-215 (application date required)
and E-216 (interview question category missing) added as provisional wording.
Tip: `MOCK_COOLDOWN_MS=3000 npm run dev:mock` shortens the 30 seconds while testing.

Next (you): run the mock server and try RD-01 to RD-06 (header `X-Mock-User`), lint + format check,
`feature/app-shell` PR, weekly review (11/20). Then Week 3 screens (11/24 SC-02-04 rounds list).
