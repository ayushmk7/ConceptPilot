/**
 * Initial React Flow graph for new or empty canvas workspaces.
 * Single source for defaults (avoid duplicating literals in pages).
 */

import type { Edge, Node } from '@xyflow/react';

export const DEFAULT_CANVAS_NODES: Node[] = [
  {
    id: '1',
    type: 'chat',
    position: { x: 250, y: 100 },
    style: { width: 420, height: 520 },
    data: { title: 'Study Session', skill: 'Tutor', messages: [] },
  },
  {
    id: '2',
    type: 'document',
    position: { x: 700, y: 150 },
    data: { title: 'Lecture Notes.pdf', pages: 24 },
  },
];

export const DEFAULT_CANVAS_EDGES: Edge[] = [
  { id: 'e2-1', source: '2', target: '1', type: 'smart', animated: true },
];
