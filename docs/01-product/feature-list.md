# Feature List

## Purpose

An exhaustive breakdown of NOVA's features by capability category, each
tagged with the phase in which it becomes available. This is the
detailed counterpart to `product-specification.md`'s category overview.

## Scope

Every feature here must trace to a capability in `product-specification.md` and respect the boundary in `docs/00-overview/non-goals.md`. Features not listed here and not on `ROADMAP.md` Phase 5 are out of scope, full stop.

## Understand

| Feature | Phase |
|---|---|
| Answer questions about past activity, grounded in observed data | 1 |
| Explain a project from its linked files, notes, and decisions | 1 |
| Find a forgotten file by name, content, or context | 1 |
| Recall a specific past conversation or decision | 1 |
| Track progress on an ongoing project across sessions | 1 |
| Surface relationships between entities via the Knowledge Graph | 1 |

## Remember

| Feature | Phase |
|---|---|
| Working, Recent, and Long-term memory tiers | 1 |
| Fixed-schema Knowledge Graph | 1 |
| Per-project memory scoping | 1 |
| User preference storage with confidence scoring | 1 |
| Agent scratch memory, merged into permanent memory after verification | 3 |
| Context spanning months/years via Long-term Memory and Archive | 1 (grows over time) |

## Observe

| Feature | Phase |
|---|---|
| Filesystem observation (granted folders only) | 1 |
| Application/window observation | 1 |
| Git repository observation | 1 |
| Browser activity observation | 1 |
| Keyboard activity observation (activity/idle and registered hotkey signals; never keystrokes) | 1 |
| Clipboard observation | 1 |
| Terminal history observation | 1 |
| Container observation | 2 |
| Per-source granular, revocable permission | 1 |

## Reason

| Feature | Phase |
|---|---|
| Deterministic-first task resolution | 1 |
| Ambiguity-resolution decision flow (LLM invocation gate) | 1 |
| Hierarchical iterative planning with replanning | 3 |
| Dynamic replanning that reuses completed work on correction | 3 |
| Deterministic Model Router (not LLM-based routing) | 2 |

## Act

| Feature | Phase |
|---|---|
| Execution-priority chain (Native → ... → Vision → Keyboard/Mouse) | 2 (full chain by 4) |
| Risk-tiered execution with confirmation gating | 2 |
| Whitelisted native/CLI/MCP tool integrations | 2 |
| Accessibility-tree-based GUI control | 4 |
| Vision-guided keyboard/mouse control (explicit app allow-list only) | 4 |

## Verify

| Feature | Phase |
|---|---|
| Ground-truth-first verification (exit codes, hashes, API responses, accessibility state) | 2 |
| Vision-based verification as fallback only | 4 |
| "Unverified" as a distinct outcome from "failed" | 2 |
| Retry / alternate-method recovery on verification failure | 3 |
| Undo support for every reversible action | 2 |

## Orchestrate

| Feature | Phase |
|---|---|
| Single parameterized agent runtime (not per-type implementations) | 3 |
| Resource-lock manager for concurrent/overlapping actions | 3 |
| Multi-step task chaining with per-step verification | 3 |

## Integrate

| Feature | Phase |
|---|---|
| Multiple AI provider support (cloud and local) | 2 |
| MCP server support | 2 |
| Public REST/WebSocket/SDK API | 3 (Tier 3 docs) |
| Plugin system for custom tools | 3 |

## Extend (v5)

| Feature | Phase |
|---|---|
| Provider-agnostic capability system (LLM, vision, STT, TTS, embeddings, OCR, reranking) | 5 |
| First-time setup wizard covering every capability | 5 |
| Hardware detection and local model management | 5 |
| Always-listening voice assistant: wake word, streaming, barge-in | 5 |
| Android companion: notifications, app control, files, camera vision | 5 |
| Multi-device sync (memory, task state, identity) | 5 |
| Remote control over Tailscale | 5 |
| Screen streaming from phone | 5 |
| Messaging platform assistants: Telegram, Discord, WhatsApp, extensible to any platform | 5 |
| Email assistant (draft + confirmed send) | 5 |
| Calendar assistant (read, create, conflict detection) | 5 |
| Phone calls: screening, assisted answering, placing calls | 5 |
| Autonomous plugin/MCP discovery, gated by explicit install confirmation | 5 |
| Automatic third-party software installation, gated by explicit confirmation | 5 |
| Personal analytics ("what did I do this month") | 5 |
| Adaptive personalization (policy-level, never model fine-tuning) | 5 |
| Background/proactive life assistant (briefings, prep) | 5 |
| Multi-agent collaboration for parallelizable tasks | 5 |
| Browser as a reasoning/automation surface, not just an observed one | 5 |
| Vision everywhere: desktop, phone, camera, browser under one capability | 5 |
| AI Phone: staged path to a full-peer mobile runtime | 6 |

## Related documents

- `feature-priority.md` — the "keep only 20%" v1-critical subset of this
  list
- `product-specification.md` — the category-level narrative this list
  details
- `ROADMAP.md` — the phase definitions referenced in the tables above
