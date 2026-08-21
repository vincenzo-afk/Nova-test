# Diagram: System Overview

## Purpose

Standalone reference to NOVA's top-level system diagram, for readers who
want the visual without navigating into the full architecture narrative.

## Source

This diagram is authoritative in, and must be kept in sync with,
`docs/02-architecture/system-architecture.md`.

## Diagram

```mermaid
flowchart TB
    subgraph "NOVA Host Process (Windows Service)"
        SUP[Runtime Manager / Supervisor]
        subgraph "Supervised Service Processes"
            OBS[Observer]
            MEM[Memory]
            KG[Knowledge Graph]
            PLAN[Planner]
            EXE[Executor]
            VER[Verifier]
            GW[API Gateway]
        end
        BUS[[Communication Bus - local IPC]]
    end
    UI[UI Layer - separate process]
    OS[(Windows OS APIs)]

    SUP --- OBS & MEM & KG & PLAN & EXE & VER & GW
    OBS <--> BUS
    MEM <--> BUS
    KG <--> BUS
    PLAN <--> BUS
    EXE <--> BUS
    VER <--> BUS
    GW <--> BUS
    UI <--> GW
    OBS --> OS
    EXE --> OS
```

## Reading notes

The UI Layer's isolation from the Communication Bus (connecting only
through the API Gateway) is the visual representation of its
unprivileged process status described in
`docs/10-security/sandboxing.md`. The Observer and Executor are the only
processes with a direct arrow to Windows OS APIs, reflecting that they
are the only processes holding OS-level capability
(`docs/02-architecture/system-architecture.md`).

## Related documents

- `docs/02-architecture/system-architecture.md` — the full narrative this
  diagram illustrates
- `services.md` — the per-service responsibility diagram, complementing
  this topology view
