'use client';

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, Settings, Download, FileText } from 'lucide-react';
import { ChatNode } from '@/components/canvas/ChatNode';
import { DocumentNode } from '@/components/canvas/DocumentNode';

const nodeTypes = {
  chat: ChatNode,
  document: DocumentNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'chat',
    position: { x: 250, y: 100 },
    data: { title: 'Study Session', skill: 'Tutor', messages: [] },
  },
  {
    id: '2',
    type: 'document',
    position: { x: 550, y: 150 },
    data: { title: 'Lecture Notes.pdf', pages: 24 },
  },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
];

export default function InfiniteCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addChatNode = () => {
    const newNode: Node = {
      id: `chat-${Date.now()}`,
      type: 'chat',
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: { title: 'New Chat', skill: 'Tutor', messages: [] },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowAddMenu(false);
  };

  const addDocumentNode = () => {
    const newNode: Node = {
      id: `doc-${Date.now()}`,
      type: 'document',
      position: { x: Math.random() * 500 + 100, y: Math.random() * 300 + 100 },
      data: { title: 'New Document.pdf', pages: 12 },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowAddMenu(false);
  };

  return (
    <div className="h-screen w-screen bg-[#FAFBFC] relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-white rounded-full shadow-lg border border-[#E2E8F0] px-6 py-3 flex items-center gap-4">
          <input
            type="text"
            defaultValue="EECS 280 Study Workspace"
            className="font-medium text-[#00274C] bg-transparent border-none outline-none"
          />

          <div className="h-6 w-px bg-[#E2E8F0]" />

          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors"
            >
              <Plus className="w-4 h-4 text-[#00274C]" />
              <span className="text-sm font-medium text-[#00274C]">Add</span>
            </button>

            {showAddMenu && (
              <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-lg border border-[#E2E8F0] py-2 min-w-[160px]">
                <button
                  onClick={addChatNode}
                  className="w-full text-left px-4 py-2 text-sm text-[#1A1A2E] hover:bg-[#E8EEF4] transition-colors"
                >
                  Add Chat
                </button>
                <button
                  onClick={addDocumentNode}
                  className="w-full text-left px-4 py-2 text-sm text-[#1A1A2E] hover:bg-[#E8EEF4] transition-colors"
                >
                  Add from File
                </button>
              </div>
            )}
          </div>

          <button className="px-4 py-1.5 bg-[#FFCB05] text-[#00274C] rounded-md text-sm font-medium hover:bg-[#FFCB05]/90 transition-colors">
            Generate Study Content
          </button>

          <button className="p-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors">
            <FileText className="w-4 h-4 text-[#00274C]" />
          </button>

          <button className="p-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors">
            <Download className="w-4 h-4 text-[#00274C]" />
          </button>

          <button className="p-1.5 hover:bg-[#E8EEF4] rounded-md transition-colors">
            <Settings className="w-4 h-4 text-[#00274C]" />
          </button>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <div className="flex items-center gap-1">
          {['JD', 'SK', 'AM'].map((initials, idx) => (
            <div
              key={initials}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{
                backgroundColor: ['#3B82F6', '#16A34A', '#F59E0B'][idx],
              }}
              title={`User ${initials}`}
            >
              {initials}
            </div>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#CBD5E1', strokeWidth: 2 },
        }}
      >
        <Background
          gap={20}
          size={1}
          color="#E2E8F0"
          style={{ backgroundColor: '#FAFBFC' }}
        />
        <Controls
          className="bg-white rounded-lg shadow-lg border border-[#E2E8F0]"
          showInteractive={false}
        />
        <MiniMap
          className="bg-white rounded-lg shadow-lg border border-[#E2E8F0]"
          nodeColor="#00274C"
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}
