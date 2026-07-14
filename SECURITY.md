# Security Policy

This project processes biometric data (face embeddings). We take
vulnerabilities seriously — especially anything touching photo access
control, face matching, or data deletion.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.
Email: mathias.simoens1@gmail.com with a description and reproduction steps.
You will get a response within 72 hours.

## Scope of highest concern

- Seeing photos of people other than yourself (authorization bypass)
- Photo/gallery enumeration
- Access to raw embeddings or selfies
- Bypass of deletion/erasure flows

Threat model: `docs/design/06-security-privacy.md`.
