# Landmines: Plugins & Sandboxing


## Where this breaks

1. **Plugin manifest permissions not validated against actual plugin
   behavior at runtime** — a plugin declaring "read-only filesystem
   access" but actually calling a write syscall must be caught by the
   sandbox, not trusted because the manifest said so.
2. **Plugin dependency version conflicts resolved by "last one wins"**
   instead of the documented resolution strategy in
   `plugin-dependencies.md`, silently running a plugin against an
   incompatible dependency version.
3. **Plugin crash taking down the host process** because the plugin
   runs in-process instead of in the documented sandbox boundary — a
   single misbehaving plugin must not be able to crash NOVA's core
   runtime.
4. **Plugin marketplace install skipping signature/integrity
   verification** "to save time in dev," then that shortcut shipping to
   production — supply-chain verification must be non-bypassable, not
   feature-flagged off by default.
5. **Plugin lifecycle hooks (install/enable/disable/uninstall) not
   idempotent** — re-running "enable" on an already-enabled plugin must
   be a no-op, not a duplicate-registration bug.
6. **Resource limits (CPU/memory/network) declared in the sandbox spec
   but not actually enforced by the runtime**, making the sandbox
   spec aspirational documentation rather than an enforced boundary.
