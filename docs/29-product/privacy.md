# Privacy (Product Layer)

User-facing privacy commitments must be a strict subset of what `10-security/` actually enforces — never a marketing claim ahead of the implementation. Every data category collected must appear in a user-visible data inventory screen with a delete action that actually purges it, including from backups per `docs/38-disaster-recovery/backup.md`.
