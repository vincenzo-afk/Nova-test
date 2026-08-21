# Migration

Every schema migration is forward-only in production but must be reversible in a rollback scenario via a paired down-migration, and must be resumable if interrupted mid-migration.
