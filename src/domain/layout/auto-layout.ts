import dagre from 'dagre';

import type { ProcessConnection, ProcessStep } from '../../types/process';

const NODE_WIDTH = 216;
const NODE_HEIGHT = 126;

export function autoLayout(
  nodes: ProcessStep[],
  edges: ProcessConnection[],
): Array<{ id: string; position: { x: number; y: number } }> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', ranksep: 96, nodesep: 44, marginx: 48, marginy: 48 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const positioned = graph.node(node.id);
    return {
      id: node.id,
      position: {
        x: (positioned?.x ?? NODE_WIDTH / 2) - NODE_WIDTH / 2,
        y: (positioned?.y ?? NODE_HEIGHT / 2) - NODE_HEIGHT / 2,
      },
    };
  });
}
