# Complete Recovery

Full-instance recovery from backup after total data loss: restore latest backup, replay any WAL segments newer than the backup, verify Knowledge Graph integrity, then resume services in the `docs/26-system-reference/02-startup-sequence.md` order.
