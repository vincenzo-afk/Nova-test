# Shutdown Performance

Graceful shutdown must flush all pending writes within a bounded time; a shutdown that can't complete within budget force-completes critical writes and defers non-critical ones to next boot's recovery pass rather than blocking indefinitely.
