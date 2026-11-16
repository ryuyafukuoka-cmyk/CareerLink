# Dev Progress

Frontend (as of 11/16): Week 1 done; app shell and Wed 11/18 auth/home screens tested OK.
Company screens are all written and wired in `screenElements.jsx`, but NOT yet tested or walked through:
SC-04-01 list (+ RegionSelect, api/companies.js), SC-04-02 detail + 3-step delete dialog, SC-04-03 form.
11/16: form cancel button now matches the dialog style, and focus moves to the first field with an error.

Next (you): walk through the company screens as student / instructor / admin (delete is admin only, 409 re-confirm),
then `npm run lint` and `npm run format:check`, then the `feature/app-shell` PR and weekly review (11/20).
After that: Week 3 rounds (11/23 mock server for rounds).
