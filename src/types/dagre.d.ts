declare module 'dagre' {
  interface GraphLabel {
    rankdir?: string;
    ranksep?: number;
    nodesep?: number;
    marginx?: number;
    marginy?: number;
  }

  interface GraphNode {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }

  class Graph {
    constructor(options?: { multigraph?: boolean; compound?: boolean });
    setGraph(label: GraphLabel): Graph;
    setDefaultEdgeLabel(label: () => Record<string, never>): Graph;
    setNode(id: string, label: GraphNode): Graph;
    setEdge(source: string, target: string): Graph;
    node(id: string): GraphNode | undefined;
  }

  export function layout(graph: Graph): void;
  export const graphlib: { Graph: typeof Graph };
}
