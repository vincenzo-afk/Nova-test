# Landmines: Model Router & Providers


## Where this breaks

1. **Fallback chain silently degrades quality without signaling it.** If
   Provider A fails and the router falls back to a weaker local model,
   downstream code that assumed Provider A's capability level (e.g.
   tool-calling support) can break in ways that look like a logic bug
   rather than a routing event. Every response must carry which
   provider actually served it.
2. **Cost/latency tracking implemented per-call but never aggregated**,
   so budget limits (`docs/11-performance/performance-goals.md`,
   `docs/14-development/configuration-schema.md`'s daily-spend-ceiling
   key) are unenforceable because there's no running total to check
   against.
3. **Provider-specific response quirks leaking through the abstraction.**
   E.g. one provider returns empty string vs. another returns null for
   "no output" — if the Provider Interface adapter doesn't normalize this,
   every caller has to special-case it, and most won't.
4. **Retrying a failed model call without checking whether the failure
   was retryable** (rate limit vs. content policy rejection vs. auth
   failure). Retrying an auth failure or content-policy rejection wastes
   time and can trip additional rate limits.
5. **Streaming responses not handling a mid-stream disconnect** — code
   that assumes a stream either completes or throws immediately will hang
   or silently truncate output on a network drop mid-stream.
6. **Credentials cached in memory indefinitely** without honoring
   rotation/expiry from `credential-management.md`, causing silent auth
   failures well after a key was rotated, hard to diagnose because the
   old key "was working."
7. **Local model hardware-detection assumed static** — code that checks
   available VRAM once at startup and never re-checks will make bad
   routing decisions after another process starts consuming GPU memory.
8. **Prompt-injection from tool output not sanitized before being fed
   back into the next model call** — a plugin's or web page's returned
   content must be treated as untrusted data, not as trusted context;
   failing to delimit/sanitize it is a direct prompt-injection vector.
