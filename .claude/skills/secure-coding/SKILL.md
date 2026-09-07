---
name: secure-coding
description: |
  Security patterns for the code in this repo: JWT handling and token revocation, the BFF OAuth exchange, CSRF double-submit cookies, ownership checks on game resources, input validation, and secret handling. Use when touching auth, cookies, tokens, the proxy route, or anything that reads user input.
---

# Secure Coding Standards

## Core Principle

**Never write security code that is "safe by coincidence."**

Code that relies on library defaults for security behavior is a time bomb. Future refactoring, library updates, or developer unfamiliarity can introduce vulnerabilities silently.

## Mandatory Rules

### 1. Explicit Over Implicit

All security-critical behavior must be explicitly configured in code, never rely on defaults.

**Bad:**

```typescript
jwt.verify(token, secret); // Uses default algorithm from token header
```

**Good:**

```typescript
jwt.verify(token, secret, { algorithms: ['HS256'] }); // Explicit algorithm
```

### 2. JWT Tokens

Always specify:

- `algorithms` array in verify() - prevents algorithm confusion attacks
- `issuer` and `audience` claims - prevents token misuse across services
- Explicit expiration

```typescript
// Signing
jwt.sign(payload, secret, {
  algorithm: 'HS256',
  expiresIn: '7d',
});

// Verification
jwt.verify(token, secret, {
  algorithms: ['HS256'], // REQUIRED - explicit algorithm
  issuer: 'my-service',
  audience: 'my-frontend',
});
```

### 3. Cookies

Always specify all security attributes:

```typescript
res.cookie('token', value, {
  httpOnly: true, // Prevents XSS access
  secure: true, // HTTPS only (in production)
  sameSite: 'strict', // CSRF protection
  path: '/', // Explicit scope
  maxAge: 604800000, // Explicit expiration
});
```

### 4. Cryptography

Never use default algorithms. Always specify:

```typescript
// Hashing
crypto.createHash('sha256'); // Explicit algorithm

// HMAC
crypto.createHmac('sha256', key); // Explicit algorithm

// Encryption
crypto.createCipheriv('aes-256-gcm', key, iv); // Explicit cipher
```

### 6. OAuth/OIDC

Always validate:

- State parameter (CSRF)
- Nonce (replay attacks)
- Token issuer
- Token audience

```typescript
// Verify ID token
const payload = jwt.verify(idToken, publicKey, {
  algorithms: ['RS256'],
  issuer: 'https://accounts.google.com',
  audience: config.clientId,
});
```

### 7. Secrets Management

#### Never Expose Secrets

- Never log secrets (even partially)
- Never include in error messages
- Never commit to git

```typescript
// ❌ BAD - Logging secrets
console.log('API Key:', apiKey);
console.log('Config:', JSON.stringify(config)); // May contain secrets

// ✅ GOOD - Redact secrets in logs
console.log('API Key:', apiKey ? '[REDACTED]' : '[MISSING]');
```

#### Environment Variables Best Practices

```typescript
// ❌ BAD - Direct access without validation
const secret = process.env.JWT_SECRET;
jwt.sign(payload, secret); // Could be undefined!

// ✅ GOOD - Validate on startup (unifiedConfig pattern)
// config/unifiedConfig.ts
const requiredEnvVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
] as const;

function validateEnv(): void {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Call on app startup
validateEnv();

export const config = {
  jwtSecret: process.env.JWT_SECRET!, // Safe after validation
  // ...
};
```

#### .env File Security

```bash
# .gitignore - MUST include
.env
.env.local
.env.*.local
*.pem
*.key
```

```typescript
// ✅ GOOD - Use .env.example for documentation (no real values)
// .env.example
JWT_SECRET=your-jwt-secret-here
DATABASE_URL=postgresql://user:password@localhost:5432/db
GOOGLE_CLIENT_ID=your-google-client-id
```

#### Constant-Time Comparison

```typescript
// ❌ BAD - Timing attack vulnerable
if (apiKey === storedKey) {
}

// ✅ GOOD - Constant time comparison
import crypto from 'crypto';

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still compare to prevent timing leak on length
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
```

#### Secret Rotation

```typescript
// Support multiple valid secrets during rotation
const validSecrets = [
  process.env.JWT_SECRET_CURRENT,
  process.env.JWT_SECRET_PREVIOUS, // Still valid during rotation
].filter(Boolean);

function verifyToken(token: string): JWTPayload {
  for (const secret of validSecrets) {
    try {
      return jwt.verify(token, secret!, { algorithms: ['HS256'] });
    } catch {
      continue;
    }
  }
  throw new Error('Invalid token');
}

// Sign with current secret only
function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET_CURRENT!, {
    algorithm: 'HS256',
    expiresIn: '7d',
  });
}
```

#### Secrets Checklist

- [ ] All secrets from environment variables (never hardcoded)
- [ ] `.env` files in `.gitignore`
- [ ] Required env vars validated on startup
- [ ] `.env.example` exists (without real values)
- [ ] Secrets never logged or in error messages
- [ ] Constant-time comparison for secret validation
- [ ] Secret rotation strategy in place

### 8. Input Validation

Validate and sanitize at system boundaries:

```typescript
// Use Zod with explicit constraints
const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  gameId: z.string().uuid(), // Validate UUID format
});

// Always use safeParse, not parse
const result = schema.safeParse(input);
if (!result.success) {
  return { error: 'Invalid input' }; // Don't expose Zod errors to user
}
```

### 9. SQL Injection Prevention

**Why Prisma protects you:** Prisma uses parameterized queries by default. Never bypass this.

```typescript
// ❌ DANGEROUS - Raw SQL with interpolation
const user = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);

// ❌ DANGEROUS - String concatenation
const query = `SELECT * FROM games WHERE id = '${gameId}'`;

// ✅ SAFE - Prisma's query builder (always parameterized)
const user = await prisma.user.findUnique({
  where: { email },
});

// ✅ SAFE - Raw SQL with parameters
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${email}
`;
```

**Rules:**

- Never use `$queryRawUnsafe` with user input
- Never concatenate strings into SQL
- Always use Prisma's query builder or tagged template literals

### 10. XSS Prevention

**React's built-in protection:** React escapes content by default. Don't bypass it.

```typescript
// ❌ DANGEROUS - Bypasses React's XSS protection
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ SAFE - If you MUST render HTML, sanitize first
import DOMPurify from 'isomorphic-dompurify';

const cleanHtml = DOMPurify.sanitize(userContent, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: []
});
<div dangerouslySetInnerHTML={{ __html: cleanHtml }} />

// ✅ SAFE - Just use React normally
<div>{userContent}</div>
```

**Content Security Policy (CSP):**

```typescript
// next.config.js - Add security headers
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://api.example.com",
    ].join('; '),
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
];
```

### 11. CSRF Protection

**Our pattern:** Double-submit cookie (already implemented in this project).

```typescript
// How it works:
// 1. Server sets csrf_token cookie (readable by JS)
// 2. Client reads cookie, sends in X-CSRF-Token header
// 3. Server validates: cookie value === header value

// Client-side (apiClient.ts)
const csrfToken = getCookie('csrf_token');
headers['X-CSRF-Token'] = csrfToken;

// Server-side validation
const cookieToken = req.cookies.csrf_token;
const headerToken = req.headers['x-csrf-token'];

if (!cookieToken || !headerToken) {
  return res.status(403).json({ error: 'Missing CSRF token' });
}

// Use constant-time comparison
if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
  return res.status(403).json({ error: 'Invalid CSRF token' });
}
```

**Rules:**

- CSRF protection required on all state-changing requests (POST, PUT, DELETE, PATCH)
- Use constant-time comparison to prevent timing attacks
- Generate tokens with sufficient entropy (32 bytes minimum)

### 12. Rate Limiting

Protect against brute force and DoS:

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per 15 minutes
  message: { error: 'Too many login attempts' },
});

// Apply
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
```

### 13. Error Handling (No Information Leakage)

Never expose internal details to users:

```typescript
// ❌ DANGEROUS - Exposes internals
catch (error) {
  return res.status(500).json({
    error: error.message,
    stack: error.stack,
    query: sql,
  });
}

// ✅ SAFE - Generic message to user, details to logs
catch (error) {
  // Log full details for debugging (Sentry, console)
  console.error('Database error:', error);
  Sentry.captureException(error);

  // Generic message to user
  return res.status(500).json({
    error: 'An unexpected error occurred',
  });
}
```

**Rules:**

- Never send `error.message` or `error.stack` to clients
- Log detailed errors server-side (Sentry)
- Use generic error messages for users
- Don't reveal if email/username exists (auth flows)

## OWASP Top 10 Quick Reference

| #   | Vulnerability             | Our Protection                            |
| --- | ------------------------- | ----------------------------------------- |
| 1   | Broken Access Control     | Ownership checks, JWT validation          |
| 2   | Cryptographic Failures    | Explicit algorithms, bcrypt for passwords |
| 3   | Injection                 | Prisma (parameterized), Zod validation    |
| 4   | Insecure Design           | Code review, threat modeling              |
| 5   | Security Misconfiguration | Explicit configs, no defaults             |
| 6   | Vulnerable Components     | `pnpm audit`, Dependabot                  |
| 7   | Auth Failures             | JWT with explicit alg, httpOnly cookies   |
| 8   | Data Integrity Failures   | CSRF tokens, input validation             |
| 9   | Logging Failures          | Sentry, no secrets in logs                |
| 10  | SSRF                      | URL validation, allowlists                |

## Pre-Commit Security Checklist

### Secrets & Config

- [ ] No hardcoded API keys, tokens, or passwords
- [ ] All secrets from environment variables
- [ ] `.env` files in `.gitignore`

### Authentication & Authorization

- [ ] JWT verified with explicit algorithm
- [ ] Cookie attributes set (httpOnly, secure, sameSite)
- [ ] Ownership checks on resource access
- [ ] No user enumeration (same response for invalid user/password)

### Input & Output

- [ ] All user input validated with Zod
- [ ] No string concatenation in SQL
- [ ] No `dangerouslySetInnerHTML` without sanitization
- [ ] Error messages don't expose internals

### Protection Mechanisms

- [ ] CSRF tokens on state-changing operations
- [ ] Rate limiting on sensitive endpoints

### Code Quality

- [ ] Constant-time comparison for secrets
- [ ] Explicit crypto algorithms
- [ ] Errors logged to Sentry, not exposed to users
