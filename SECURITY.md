# Security Policy

## Supported versions

Nova is currently in active development at version `0.1.0`. The `main` branch is the supported development target until a stable release policy is published. Older commits and branches are not maintained as supported versions.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through [GitHub Security Advisories](https://github.com/vincenzo-afk/Nova-test/security/advisories/new). Include the affected commit or version, a concise description, reproduction steps, impact assessment, and any safe mitigation details. Do not publish exploit details in a public issue before the maintainer has had an opportunity to investigate.

Do not include passwords, access tokens, private keys, personal data, or full sensitive logs in a report. Redact or replace those values with clearly marked placeholders.

The project does not currently promise a fixed response time or a formal support service level. The maintainer will assess reports according to severity and available maintenance capacity.

## Security practices

Nova’s maintained code includes permission-first onboarding, explicit observer grants, Electron context isolation, disabled renderer Node integration, sandboxed renderer configuration, typed error boundaries, credential-store boundaries, encrypted-backup boundaries, authenticated network discovery, and release-time documentation and static checks.
