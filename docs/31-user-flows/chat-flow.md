# Chat Flow

## Flow

User opens Chat → types/dictates request → Planner streams intermediate status ("checking calendar…") → final response with any actions taken shown inline as chips linking to their outcome. Failure branch: Planner cannot resolve request deterministically or via available providers → explicit 'I can't do this yet, here's why' message, never a silent non-answer.

## Reference

See matching screen specs in `40-screens/` and component specs in `41-components/`.
