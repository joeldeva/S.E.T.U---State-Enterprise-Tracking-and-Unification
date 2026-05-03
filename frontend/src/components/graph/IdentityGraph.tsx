import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";
import type { ActivityEvent, MatchCandidate, UbidRecord } from "../../lib/api";

export type GraphSelection =
  | {
      type: "node";
      id: string;
      label: string;
      details: Record<string, string | number | null | undefined>;
    }
  | {
      type: "edge";
      id: string;
      label: string;
      details: Record<string, string | number | null | undefined>;
      evidence?: Record<string, unknown>;
    };

interface IdentityGraphProps {
  ubid: UbidRecord;
  matchCandidates: MatchCandidate[];
  activityEvents: ActivityEvent[];
  onSelect: (selection: GraphSelection) => void;
}

const departmentColors: Record<string, string> = {
  factories: "#8B7CF6",
  labour: "#FF7A2E",
  shops: "#26A882",
  kspcb: "#4A90D9",
  bescom: "#F5A623",
  bwssb: "#22B888",
};

function statusFromCandidate(candidate: MatchCandidate): "auto_link" | "reviewer_approved" | "pending_review" | "rejected" {
  if (candidate.status === "reviewer_approved") return "reviewer_approved";
  if (candidate.status === "rejected_by_reviewer") return "rejected";
  if (candidate.decision_zone === "auto_link") return "auto_link";
  return "pending_review";
}

function edgeStyle(status: string) {
  if (status === "auto_link") return { stroke: "#22B888", strokeWidth: 2.4 };
  if (status === "reviewer_approved") return { stroke: "#26A882", strokeWidth: 2.4 };
  if (status === "rejected") return { stroke: "#E74C3C", strokeWidth: 2, strokeDasharray: "4 4" };
  return { stroke: "#F5A623", strokeWidth: 2, strokeDasharray: "6 4" };
}

function sourceDepartment(sourceId: string, candidate?: MatchCandidate) {
  const departments = candidate?.departments ?? [];
  if (sourceId.includes("factories")) return "Factories";
  if (sourceId.includes("labour")) return "Labour";
  if (sourceId.includes("shops")) return "Shops";
  if (sourceId.includes("kspcb")) return "KSPCB";
  if (sourceId.includes("bescom")) return "BESCOM";
  if (sourceId.includes("bwssb")) return "BWSSB";
  return departments[0] ?? "Department";
}

function departmentColor(department: string) {
  const key = department.toLowerCase().split(" ")[0];
  return departmentColors[key] ?? "#A8B8CF";
}

function recordNode(sourceId: string, index: number, total: number, candidate?: MatchCandidate): Node {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;
  const department = sourceDepartment(sourceId, candidate);
  const color = departmentColor(department);

  return {
    id: sourceId,
    type: "default",
    position: {
      x: 380 + Math.cos(angle) * 285,
      y: 230 + Math.sin(angle) * 180,
    },
    data: {
      label: (
        <div className="rf-node-content">
          <span>{department}</span>
          <strong>{sourceId}</strong>
        </div>
      ),
    },
    style: {
      background: "#142540",
      border: `1px solid ${color}`,
      color: "#E8EDF5",
      borderRadius: 8,
      width: 156,
      minHeight: 58,
      fontSize: 11,
    },
  };
}

function activityNode(event: ActivityEvent, index: number): Node {
  return {
    id: event._id,
    type: "default",
    position: {
      x: 730,
      y: 90 + index * 78,
    },
    data: {
      label: (
        <div className="rf-node-content">
          <span>{event.source}</span>
          <strong>{event.event_type.split("_").join(" ")}</strong>
        </div>
      ),
    },
    style: {
      background: "rgba(74, 144, 217, 0.12)",
      border: "1px solid rgba(74, 144, 217, 0.65)",
      color: "#E8EDF5",
      borderRadius: 8,
      width: 158,
      minHeight: 58,
      fontSize: 11,
    },
  };
}

function edgeLabel(status: string, confidence?: number) {
  const prefix = status === "pending_review" ? "review" : status.replace("_", " ");
  return `${confidence ?? 0}% ${prefix}`;
}

function buildGraph(ubid: UbidRecord, matchCandidates: MatchCandidate[], activityEvents: ActivityEvent[]) {
  const linkedRecords = ubid.linked_records ?? [];
  const candidateRecords = ubid.candidate_records ?? [];
  const sourceIds = Array.from(new Set([...linkedRecords, ...candidateRecords]));
  const nodeCandidate = new Map<string, MatchCandidate>();

  matchCandidates.forEach((candidate) => {
    if (sourceIds.includes(candidate.record_a)) nodeCandidate.set(candidate.record_a, candidate);
    if (sourceIds.includes(candidate.record_b)) nodeCandidate.set(candidate.record_b, candidate);
  });

  const nodes: Node[] = [
    {
      id: ubid._id,
      type: "default",
      position: { x: 380, y: 230 },
      data: {
        label: (
          <div className="rf-node-content ubid-rf-node">
            <span>UBID</span>
            <strong>{ubid._id}</strong>
          </div>
        ),
      },
      style: {
        background: "rgba(242, 100, 25, 0.14)",
        border: "1px solid rgba(242, 100, 25, 0.8)",
        color: "#FF7A2E",
        borderRadius: 8,
        width: 186,
        minHeight: 70,
        fontSize: 11,
      },
    },
    ...sourceIds.map((sourceId, index) => recordNode(sourceId, index, sourceIds.length, nodeCandidate.get(sourceId))),
    ...activityEvents.map((event, index) => activityNode(event, index)),
  ];

  const edges: Edge[] = sourceIds.map((sourceId) => {
    const candidate = nodeCandidate.get(sourceId);
    const isLinked = linkedRecords.includes(sourceId);
    const status = isLinked ? statusFromCandidate(candidate ?? ({ decision_zone: "auto_link" } as MatchCandidate)) : "pending_review";
    const confidence = candidate?.confidence ?? ubid.status_confidence ?? ubid.match_confidence ?? 0;

    return {
      id: `${ubid._id}-${sourceId}`,
      source: ubid._id,
      target: sourceId,
      label: edgeLabel(status, confidence),
      data: {
        status,
        confidence,
        evidence: candidate?.evidence,
        explanation: candidate?.explanation ?? "Linked department record belongs to this UBID cluster.",
      },
      style: edgeStyle(status),
      labelStyle: { fill: "#A8B8CF", fontSize: 10 },
      labelBgStyle: { fill: "#0F2035", fillOpacity: 0.86 },
    };
  });

  activityEvents.forEach((event) => {
    edges.push({
      id: `${ubid._id}-${event._id}`,
      source: ubid._id,
      target: event._id,
      label: `${event.joined_confidence ?? 0}% activity`,
      data: {
        status: "activity_event",
        confidence: event.joined_confidence ?? 0,
        explanation: `${event.source} ${event.event_type.split("_").join(" ")} on ${event.event_date}`,
      },
      style: { stroke: "#4A90D9", strokeWidth: 1.8, strokeDasharray: "3 5" },
      labelStyle: { fill: "#A8B8CF", fontSize: 10 },
      labelBgStyle: { fill: "#0F2035", fillOpacity: 0.86 },
    });
  });

  return { nodes, edges };
}

function IdentityGraph({ ubid, matchCandidates, activityEvents, onSelect }: IdentityGraphProps) {
  const { nodes, edges } = buildGraph(ubid, matchCandidates, activityEvents);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelect({
      type: "node",
      id: node.id,
      label: node.id === ubid._id ? "UBID node" : activityEvents.some((event) => event._id === node.id) ? "Activity event node" : "Department record node",
      details: {
        id: node.id,
        node_type: node.id === ubid._id ? "UBID" : activityEvents.some((event) => event._id === node.id) ? "Activity event" : "Department record",
      },
    });
  };

  return (
    <div className="identity-graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.45}
        maxZoom={1.3}
        onNodeClick={handleNodeClick}
        onEdgeClick={(_, edge) => {
          onSelect({
            type: "edge",
            id: edge.id,
            label: String(edge.label ?? "Graph edge"),
            details: {
              source: edge.source,
              target: edge.target,
              status: edge.data?.status,
              confidence: edge.data?.confidence,
              explanation: edge.data?.explanation,
            },
            evidence: edge.data?.evidence,
          });
        }}
      >
        <Background color="#1F3355" gap={18} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => (node.id === ubid._id ? "#F26419" : node.id.startsWith("event_") ? "#4A90D9" : "#26A882")}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default IdentityGraph;
