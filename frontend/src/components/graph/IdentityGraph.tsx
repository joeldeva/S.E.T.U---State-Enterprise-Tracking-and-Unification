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
  factories: "#4F46E5",
  labour:    "#1D4ED8",
  shops:     "#047857",
  kspcb:     "#2563EB",
  bescom:    "#B45309",
  bwssb:     "#0F766E",
};

function statusFromCandidate(c: MatchCandidate): "auto_link" | "reviewer_approved" | "pending_review" | "rejected" {
  if (c.status === "reviewer_approved")    return "reviewer_approved";
  if (c.status === "rejected_by_reviewer") return "rejected";
  if (c.decision_zone === "auto_link")     return "auto_link";
  return "pending_review";
}

function edgeStyle(status: string) {
  if (status === "auto_link")         return { stroke: "#047857", strokeWidth: 2.4 };
  if (status === "reviewer_approved") return { stroke: "#0F766E", strokeWidth: 2.4 };
  if (status === "rejected")          return { stroke: "#B91C1C", strokeWidth: 2, strokeDasharray: "4 4" };
  return { stroke: "#B45309", strokeWidth: 2, strokeDasharray: "6 4" };
}

function sourceDepartment(sourceId: string, candidate?: MatchCandidate) {
  if (sourceId.includes("factories")) return "Factories";
  if (sourceId.includes("labour"))    return "Labour";
  if (sourceId.includes("shops"))     return "Shops";
  if (sourceId.includes("kspcb"))     return "KSPCB";
  if (sourceId.includes("bescom"))    return "BESCOM";
  if (sourceId.includes("bwssb"))     return "BWSSB";
  return candidate?.departments?.[0] ?? "Department";
}

function departmentColor(department: string) {
  return departmentColors[department.toLowerCase().split(" ")[0]] ?? "#64748B";
}

function edgeLabel(status: string, confidence?: number) {
  const prefix = status === "pending_review" ? "review" : status.replace(/_/g, " ");
  return `${confidence ?? 0}% ${prefix}`;
}

// ── Radial layout — SOURCE RECORDS ────────────────────────────────────────────
// Centre of the circle. Radius is scaled up with node count so nodes never touch.
function recordNode(sourceId: string, index: number, total: number, candidate?: MatchCandidate): Node {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2;

  // Minimum radius so that adjacent nodes are at least 40 px apart
  // arc ≥ nodeSize + 40  →  r ≥ (nodeSize + 40) * n / (2π)
  const minR = ((170 + 40) * total) / (2 * Math.PI);
  const rx = Math.max(300, minR);   // horizontal radius
  const ry = Math.max(230, minR * 0.75); // vertical (slightly flatter)

  const CX = 430;   // circle centre X
  const CY = 310;   // circle centre Y

  const department = sourceDepartment(sourceId, candidate);
  const color = departmentColor(department);

  return {
    id: sourceId,
    type: "default",
    draggable: true,
    position: {
      x: CX + Math.cos(angle) * rx - 80,   // −80 = half node width (160 / 2)
      y: CY + Math.sin(angle) * ry - 30,   // −30 = half node height (~60 / 2)
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
      background: "#FFFFFF",
      border: `1px solid ${color}`,
      color: "#0F172A",
      borderRadius: 8,
      width: 160,
      minHeight: 58,
      fontSize: 11,
    },
  };
}

// ── ACTIVITY EVENT nodes — placed outside the record circle on the right ───────
function activityNode(event: ActivityEvent, index: number, total: number): Node {
  // Compute the same rx so we can push activities past it
  const minR = ((170 + 40) * 6) / (2 * Math.PI); // use 6 as safe upper bound
  const rx = Math.max(300, minR);
  const CX = 430;
  const CY = 310;

  const totalH = (total - 1) * 130;
  const startY = CY - totalH / 2;

  return {
    id: event._id,
    type: "default",
    draggable: true,
    position: {
      x: CX + rx + 220,          // well outside the rightmost record node
      y: startY + index * 130,
    },
    data: {
      label: (
        <div className="rf-node-content">
          <span>{event.source}</span>
          <strong>{event.event_type.replace(/_/g, " ")}</strong>
        </div>
      ),
    },
    style: {
      background: "rgba(37, 99, 235, 0.08)",
      border: "1px solid rgba(37, 99, 235, 0.35)",
      color: "#0F172A",
      borderRadius: 8,
      width: 162,
      minHeight: 58,
      fontSize: 11,
    },
  };
}

// ── Build graph ───────────────────────────────────────────────────────────────
function buildGraph(ubid: UbidRecord, matchCandidates: MatchCandidate[], activityEvents: ActivityEvent[]) {
  const linked    = ubid.linked_records    ?? [];
  const candidate = ubid.candidate_records ?? [];
  const sourceIds = Array.from(new Set([...linked, ...candidate]));

  const nodeCandidate = new Map<string, MatchCandidate>();
  matchCandidates.forEach(mc => {
    if (sourceIds.includes(mc.record_a)) nodeCandidate.set(mc.record_a, mc);
    if (sourceIds.includes(mc.record_b)) nodeCandidate.set(mc.record_b, mc);
  });

  const nodes: Node[] = [
    // UBID centre
    {
      id: ubid._id,
      type: "default",
      draggable: true,
      position: { x: 430, y: 310 },
      data: {
        label: (
          <div className="rf-node-content ubid-rf-node">
            <span>UBID</span>
            <strong>{ubid._id}</strong>
          </div>
        ),
      },
      style: {
        background: "rgba(29, 78, 216, 0.08)",
        border: "1px solid rgba(29, 78, 216, 0.5)",
        color: "#1E40AF",
        borderRadius: 8,
        width: 190,
        minHeight: 70,
        fontSize: 11,
      },
    },
    ...sourceIds.map((id, i) =>
      recordNode(id, i, sourceIds.length, nodeCandidate.get(id)),
    ),
    ...activityEvents.map((ev, i) =>
      activityNode(ev, i, activityEvents.length),
    ),
  ];

  // Edges: source records → UBID
  const edges: Edge[] = sourceIds.map(id => {
    const mc = nodeCandidate.get(id);
    const isLinked = linked.includes(id);
    const status = isLinked
      ? statusFromCandidate(mc ?? ({ decision_zone: "auto_link" } as MatchCandidate))
      : "pending_review";
    const confidence = mc?.confidence ?? ubid.status_confidence ?? ubid.match_confidence ?? 0;

    return {
      id: `${ubid._id}-${id}`,
      source: ubid._id,
      target: id,
      label: edgeLabel(status, confidence),
      data: {
        status,
        confidence,
        evidence: mc?.evidence,
        explanation: mc?.explanation ?? "Linked department record belongs to this UBID cluster.",
      },
      style: edgeStyle(status),
      labelStyle: { fill: "#64748B", fontSize: 10 },
      labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    };
  });

  // Edges: UBID → activity events
  activityEvents.forEach(ev => {
    edges.push({
      id: `${ubid._id}-${ev._id}`,
      source: ubid._id,
      target: ev._id,
      label: `${ev.joined_confidence ?? 0}% activity`,
      data: {
        status: "activity_event",
        confidence: ev.joined_confidence ?? 0,
        explanation: `${ev.source} ${ev.event_type.replace(/_/g, " ")} on ${ev.event_date}`,
      },
      style: { stroke: "#2563EB", strokeWidth: 1.8, strokeDasharray: "3 5" },
      labelStyle: { fill: "#64748B", fontSize: 10 },
      labelBgStyle: { fill: "#FFFFFF", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 3,
    });
  });

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────────────────────────────
function IdentityGraph({ ubid, matchCandidates, activityEvents, onSelect }: IdentityGraphProps) {
  const { nodes, edges } = buildGraph(ubid, matchCandidates, activityEvents);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onSelect({
      type: "node",
      id: node.id,
      label: node.id === ubid._id
        ? "UBID node"
        : activityEvents.some(e => e._id === node.id)
          ? "Activity event node"
          : "Department record node",
      details: {
        id: node.id,
        node_type: node.id === ubid._id
          ? "UBID"
          : activityEvents.some(e => e._id === node.id)
            ? "Activity event"
            : "Department record",
      },
    });
  };

  return (
    <div className="identity-graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.4}
        maxZoom={1.4}
        onNodeClick={handleNodeClick}
        onEdgeClick={(_, edge) => {
          onSelect({
            type: "edge",
            id: edge.id,
            label: String(edge.label ?? "Graph edge"),
            details: {
              source:      edge.source,
              target:      edge.target,
              status:      edge.data?.status,
              confidence:  edge.data?.confidence,
              explanation: edge.data?.explanation,
            },
            evidence: edge.data?.evidence,
          });
        }}
      >
        <Background color="#CBD5E1" gap={18} />
        <MiniMap
          pannable
          zoomable
          nodeColor={node =>
            node.id === ubid._id            ? "#1D4ED8"
            : node.id.startsWith("event_") ? "#2563EB"
            : "#047857"
          }
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default IdentityGraph;
