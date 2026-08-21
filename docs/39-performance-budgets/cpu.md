# CPU Usage

Background observers must be throttleable under system load; NOVA must never be the top CPU consumer on an otherwise idle machine outside active task execution. Concretely: idle CPU usage across all supervised services stays under 3%, per `docs/11-performance/resource-usage.md`'s and `docs/11-performance/performance-goals.md`'s idle-budget row — this file states the qualitative rule, those state the enforced number; if the two ever disagree on the number, `docs/11-performance/` is authoritative and this file must be corrected to match.
