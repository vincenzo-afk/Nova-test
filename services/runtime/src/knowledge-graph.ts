import { err, ok, type Result } from "@nova/shared";

export type GraphNodeType =
  | "User"
  | "Project"
  | "File"
  | "Application"
  | "Task"
  | "Decision"
  | "Tool"
  | "Conversation"
  | "Person"
  | "Goal"
  | "Device";
export type GraphEdgeType =
  | "belongs_to"
  | "depends_on"
  | "produced_by"
  | "performed_on"
  | "related_to"
  | "involves"
  | "pursues"
  | "advances"
  | "blocks"
  | "resides_on";

export interface GraphNode {
  readonly id: string;
  readonly type: GraphNodeType;
  readonly name: string;
  readonly properties: Readonly<Record<string, string | number | boolean>>;
  readonly active: boolean;
}

export interface GraphEdge {
  readonly id: string;
  readonly type: GraphEdgeType;
  readonly from_node_id: string;
  readonly to_node_id: string;
  readonly weight: number;
}

export interface RetrievalCandidate {
  readonly id: string;
  readonly content: string;
  readonly semantic_score: number;
  readonly keyword_score: number;
  readonly graph_score: number;
  readonly temporal_score: number;
  readonly entity_score: number;
  readonly importance: number;
  readonly recency: number;
  readonly confidence: number;
  readonly relationship_distance: number;
  readonly usage_frequency: number;
  readonly pinned: boolean;
  readonly project_relevance: number;
  readonly inactive: boolean;
  readonly sensitive_category?: string;
  readonly score?: number;
}

const nodeTypes = new Set<GraphNodeType>([
  "User",
  "Project",
  "File",
  "Application",
  "Task",
  "Decision",
  "Tool",
  "Conversation",
  "Person",
  "Goal",
  "Device",
]);
const edgeTypes = new Set<GraphEdgeType>([
  "belongs_to",
  "depends_on",
  "produced_by",
  "performed_on",
  "related_to",
  "involves",
  "pursues",
  "advances",
  "blocks",
  "resides_on",
]);

export class KnowledgeGraph {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();

  addNode(node: GraphNode): Result<GraphNode> {
    if (!nodeTypes.has(node.type) || this.nodes.has(node.id)) {
      return err({
        code: "NOVA-MEM002",
        message: "Node violates the fixed ontology or already exists.",
        retryable: false,
      });
    }
    this.nodes.set(node.id, node);
    return ok(node);
  }

  getNode(nodeId: string): Result<GraphNode> {
    const node = this.nodes.get(nodeId);
    return node
      ? ok(node)
      : err({ code: "NOVA-MEM003", message: "Graph node does not exist.", retryable: false });
  }

  addEdge(edge: GraphEdge): Result<GraphEdge> {
    const from = this.nodes.get(edge.from_node_id);
    const to = this.nodes.get(edge.to_node_id);
    if (!from || !to) {
      return err({
        code: "NOVA-MEM003",
        message: "Graph edge endpoints must exist before edge creation.",
        retryable: false,
      });
    }
    if (!edgeTypes.has(edge.type) || !this.validDirection(edge.type, from.type, to.type)) {
      return err({
        code: "NOVA-MEM002",
        message: "Graph edge violates the fixed ontology direction.",
        retryable: false,
      });
    }
    if (this.edges.has(edge.id) || this.pathExists(edge.to_node_id, edge.from_node_id)) {
      return err({
        code: "NOVA-MEM002",
        message: "Graph edge would create a cycle or duplicate edge.",
        retryable: false,
      });
    }
    this.edges.set(edge.id, edge);
    return ok(edge);
  }

  markInactive(nodeId: string): Result<GraphNode> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      return err({ code: "NOVA-MEM003", message: "Graph node does not exist.", retryable: false });
    }
    const updated = { ...node, active: false };
    this.nodes.set(nodeId, updated);
    return ok(updated);
  }

  neighbors(nodeId: string): readonly GraphNode[] {
    const neighborIds = [...this.edges.values()]
      .filter((edge) => edge.from_node_id === nodeId || edge.to_node_id === nodeId)
      .map((edge) => (edge.from_node_id === nodeId ? edge.to_node_id : edge.from_node_id));
    return neighborIds.flatMap((id) => {
      const node = this.nodes.get(id);
      return node ? [node] : [];
    });
  }

  private validDirection(edgeType: GraphEdgeType, from: GraphNodeType, to: GraphNodeType): boolean {
    switch (edgeType) {
      case "belongs_to":
        return from === "File" && to === "Project";
      case "depends_on":
        return from === "Project" && to === "Tool";
      case "produced_by":
        return from === "Decision" && (to === "Task" || to === "Conversation");
      case "performed_on":
        return from === "Task" && (to === "File" || to === "Application");
      case "involves":
        return (from === "Conversation" || from === "Task") && to === "Person";
      case "pursues":
        return from === "User" && to === "Goal";
      case "advances":
        return from === "Task" && to === "Goal";
      case "resides_on":
        return from === "File" && to === "Device";
      case "blocks":
        return to === "Goal";
      case "related_to":
        return true;
    }
  }

  private pathExists(start: string, target: string): boolean {
    const visited = new Set<string>();
    const visit = (nodeId: string): boolean => {
      if (nodeId === target) {
        return true;
      }
      if (visited.has(nodeId)) {
        return false;
      }
      visited.add(nodeId);
      return [...this.edges.values()]
        .filter((edge) => edge.from_node_id === nodeId)
        .some((edge) => visit(edge.to_node_id));
    };
    return visit(start);
  }
}
