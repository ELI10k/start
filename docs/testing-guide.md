# Testing guide

Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`. Tests use Node's built-in runner with TypeScript stripping and focus on normalization, nutrition arithmetic, plan totals/duplication, validation, check-in/progress rules, and adapters. Add domain tests beside related suites; avoid tests that only assert static markup. Representative production routes can be checked after `npm start` with localhost HTTP requests.
