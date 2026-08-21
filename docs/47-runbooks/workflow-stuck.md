# Workflow Stuck — Runbook

Symptoms: workflow instance not progressing. Detection: node status unchanged past its max-duration budget. Logs: workflow-engine execution trace. Root causes: stuck approval gate, crashed executor mid-step. Recovery: state-recovery sweep resolves to timeout/failed; user notified with resume option.
