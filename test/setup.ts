// Ensure required env vars are present before importing app modules during tests.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-must-be-at-least-16-chars';
process.env.DB_DIALECT = 'sqlite';
process.env.DB_STORAGE = ':memory:';
process.env.LOG_LEVEL = 'silent';
