# Security Architecture

## Authentication and authorization

1. User passwords are hashed with bcrypt using cost factor 12.
2. Login and registration return signed JWT access tokens.
3. JWTs use HS256 and a server-side `JWT_SECRET`.
4. The server refuses to start when the JWT secret is missing, default, or shorter than 32 characters.
5. Protected routes require a valid Bearer token.
6. Administrator authorization is read from the database user record rather than trusting a client-provided role or token role.
7. The configured administrator email cannot be registered as a normal user.

## Input and abuse controls

- Zod validates request bodies and important query values.
- Authentication endpoints use configurable rate limiting.
- AI endpoints use a separate request rate limit.
- JSON request bodies are size-limited.
- AI images are validated for size and supported image signatures before analysis.
- Malformed JSON is handled as a client error.

## HTTP protections

The server sets baseline headers including:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` restricting microphone and geolocation and limiting camera access to the same origin.

Production CORS is fail-closed unless trusted origins are explicitly configured through `CORS_ORIGIN`.

## Secrets and submission hygiene

Secrets belong in `.env`, which must not be committed or submitted. The project provides `.env.example` as a template. Real database files, `node_modules`, and generated `dist` output are excluded from the final source package.

## Remaining deployment responsibility

Production deployment must still use a strong unique JWT secret, a secure admin password, HTTPS, and a server-side Gemini API key. Operational protections such as reverse-proxy limits, monitoring, backups and secret management depend on the chosen hosting environment.
