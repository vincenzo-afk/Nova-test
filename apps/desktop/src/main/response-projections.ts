import type {
  DeliveryReceipt,
  EmailSendReceipt,
  McpServerConfiguration,
  PairingOffer,
  PluginDiscoveryProposal,
  PluginDiscoveryResult,
  PluginRecord,
  SetupState,
  TaskRecord,
  WorkflowResult,
} from "@nova/runtime";

export interface PairingOfferSummary {
  readonly code: string;
  readonly primary_public_key: string;
  readonly runtime_mode: PairingOffer["runtime_mode"];
  readonly expires_at: number;
}

export function projectPairingOffer(offer: PairingOffer): PairingOfferSummary {
  return {
    code: offer.code,
    primary_public_key: offer.primary_public_key,
    runtime_mode: offer.runtime_mode,
    expires_at: offer.expires_at,
  };
}

export interface McpServerSummary {
  readonly server_id: string;
  readonly label: string;
  readonly state: McpServerConfiguration["state"];
  readonly transport: McpServerConfiguration["transport"];
}

export function projectMcpServer(server: McpServerConfiguration): McpServerSummary {
  return {
    server_id: server.server_id,
    label: server.label,
    state: server.state,
    transport: server.transport,
  };
}

export function projectMcpServers(
  servers: readonly McpServerConfiguration[],
): readonly McpServerSummary[] {
  return servers.map(projectMcpServer);
}

export interface McpServerRemovalSummary {
  readonly server_id: string;
  readonly state: "Removed";
}

export function projectMcpServerRemoval(result: McpServerRemovalSummary): McpServerRemovalSummary {
  return { server_id: result.server_id, state: result.state };
}

export interface PluginRecordSummary {
  readonly plugin_id: string;
  readonly version: string;
  readonly state: PluginRecord["state"];
  readonly provided_tool_count: number;
  readonly required_permission_count: number;
}

export function projectPluginRecord(record: PluginRecord): PluginRecordSummary {
  return {
    plugin_id: record.manifest.plugin_id,
    version: record.manifest.version,
    state: record.state,
    provided_tool_count: record.manifest.provided_tools.length,
    required_permission_count: record.manifest.required_permissions.length,
  };
}

export interface PluginDiscoveryProposalSummary {
  readonly plugin_id: string;
  readonly latest_version: string;
  readonly publisher: string;
  readonly capability_count: number;
  readonly required_permission_count: number;
  readonly status: PluginDiscoveryProposal["status"];
}

export interface PluginDiscoveryResultSummary {
  readonly capability_id: string;
  readonly domain: string;
  readonly proposals: readonly PluginDiscoveryProposalSummary[];
  readonly fallback: PluginDiscoveryResult["fallback"];
}

export function projectPluginDiscoveryProposal(
  proposal: PluginDiscoveryProposal,
): PluginDiscoveryProposalSummary {
  return {
    plugin_id: proposal.plugin_id,
    latest_version: proposal.latest_version,
    publisher: proposal.publisher,
    capability_count: proposal.capabilities.length,
    required_permission_count: proposal.required_permissions.length,
    status: proposal.status,
  };
}

export function projectPluginDiscoveryProposals(
  proposals: readonly PluginDiscoveryProposal[],
): readonly PluginDiscoveryProposalSummary[] {
  return proposals.map(projectPluginDiscoveryProposal);
}

export function projectPluginDiscoveryResult(
  result: PluginDiscoveryResult,
): PluginDiscoveryResultSummary {
  return {
    capability_id: result.capability_id,
    domain: result.domain,
    proposals: projectPluginDiscoveryProposals(result.proposals),
    fallback: result.fallback,
  };
}

export interface TaskRecordSummary {
  readonly task_id: string;
  readonly state: TaskRecord["state"];
  readonly retry_count: number;
  readonly updated_at: string;
}

export function projectTaskRecord(record: TaskRecord): TaskRecordSummary {
  return {
    task_id: record.task_id,
    state: record.state,
    retry_count: record.retry_count,
    updated_at: record.updated_at,
  };
}

export function projectTaskRecords(records: readonly TaskRecord[]): readonly TaskRecordSummary[] {
  return records.map(projectTaskRecord);
}

export interface WorkflowResultSummary {
  readonly workflow_id: string;
  readonly state: WorkflowResult["state"];
  readonly completed_node_count: number;
  readonly checkpoint_id: string;
}

export function projectWorkflowResult(result: WorkflowResult): WorkflowResultSummary {
  return {
    workflow_id: result.workflow_id,
    state: result.state,
    completed_node_count: result.completedNodeIds.length,
    checkpoint_id: result.checkpointId,
  };
}

export interface BackupRestoreSummary {
  readonly restored: true;
}

export function projectBackupRestore(...state: readonly unknown[]): BackupRestoreSummary {
  void state;
  return { restored: true };
}

export interface PreparedRestoreSummary {
  readonly restore_id: string;
  readonly verified: true;
}

export function projectPreparedRestore(restoreId: string): PreparedRestoreSummary {
  return { restore_id: restoreId, verified: true };
}

export interface SetupStateSummary {
  readonly current_step: SetupState["current_step"];
  readonly completed_steps: readonly SetupState["completed_steps"][number][];
  readonly deferred_steps: readonly SetupState["deferred_steps"][number][];
}

export function projectSetupState(state: SetupState): SetupStateSummary {
  return {
    current_step: state.current_step,
    completed_steps: [...state.completed_steps],
    deferred_steps: [...state.deferred_steps],
  };
}

export interface EmailSendReceiptSummary {
  readonly message_id: string;
  readonly sent: true;
}

export function projectEmailSendReceipt(receipt: EmailSendReceipt): EmailSendReceiptSummary {
  return { message_id: receipt.message_id, sent: true };
}

export interface ChannelDeliveryReceiptSummary {
  readonly message_id: string;
  readonly status: DeliveryReceipt["status"];
}

export function projectChannelDeliveryReceipt(
  receipt: DeliveryReceipt,
): ChannelDeliveryReceiptSummary {
  return { message_id: receipt.message_id, status: receipt.status };
}
