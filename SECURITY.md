# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | :white_check_mark: |
| < 1.2   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within LexAI, please send an email to the project maintainers. All security vulnerabilities will be promptly addressed.

**Please do not report security vulnerabilities through public GitHub issues.**

### What to include

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact
- Suggested fix (if any)

### Response timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Fix release**: Depends on severity

## Security Best Practices

When deploying LexAI:

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Use strong secrets** - Generate random values for API keys and passwords
3. **Enable HTTPS** - Always use TLS in production
4. **Rotate secrets** - Regularly update API keys and passwords
5. **Monitor logs** - Watch for suspicious activity

## Authentication

LexAI uses Clerk for authentication. Ensure:

- JWT tokens are properly validated
- JWKS endpoints are accessible
- Session timeouts are configured appropriately

## Data Protection

- Database connections use async drivers with connection pooling
- File uploads are validated and sanitized
- User inputs are validated using Pydantic schemas
- Rate limiting is enabled to prevent abuse
