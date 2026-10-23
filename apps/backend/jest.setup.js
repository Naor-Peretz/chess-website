/**
 * Test environment defaults.
 *
 * `src/config/passport.ts` builds the Google strategy at module load, and
 * passport-oauth2 throws when clientID is empty. Anything that imports
 * `src/app.ts` therefore needs these set, which previously meant the test job
 * depended on the GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET repository secrets.
 * Dependabot pull requests get their own (empty) secret store, so every
 * Dependabot PR failed here regardless of what it bumped.
 *
 * The suites never exercise a real OAuth round trip, so placeholders are
 * enough. Real values in the environment still win.
 */
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
