import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NetworkGraph({ network }) {
  const [hoveredNode, setHoveredNode] = useState(null);

  if (!network || !network.accounts || network.accounts.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        No account graph data available.
      </div>
    );
  }

  const { accounts, cycleDetected, id } = network;
  const numNodes = accounts.length;

  // Layout parameters for SVG canvas
  const size = 320;
  const center = size / 2;
  const radius = Math.min(100, (size / 2) - 45);

  // Calculate circular coordinates for each account node
  const nodes = accounts.map((acc, index) => {
    const angle = (2 * Math.PI * index) / numNodes - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { id: acc, x, y, index };
  });

  // Calculate edges between sequential accounts (and closing edge if cycle detected)
  const edges = [];
  for (let i = 0; i < numNodes; i++) {
    const nextIdx = (i + 1) % numNodes;
    // If no cycle detected and it's the last node, don't close the loop
    if (!cycleDetected && i === numNodes - 1) {
      continue;
    }
    edges.push({
      from: nodes[i],
      to: nodes[nextIdx],
      isCycleClosing: cycleDetected && i === numNodes - 1
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        style={{
          width: '100%',
          maxWidth: `${size}px`,
          height: 'auto',
          overflow: 'visible'
        }}
      >
        <defs>
          {/* Arrowhead marker */}
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="22"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path
              d="M 0 1.5 L 10 5 L 0 8.5 z"
              fill={cycleDetected ? '#ef4444' : '#3b82f6'}
            />
          </marker>
        </defs>

        {/* Directed Edges */}
        {edges.map((edge, idx) => {
          const isHighlighted =
            hoveredNode === edge.from.id || hoveredNode === edge.to.id;

          return (
            <line
              key={`edge-${idx}`}
              x1={edge.from.x}
              y1={edge.from.y}
              x2={edge.to.x}
              y2={edge.to.y}
              stroke={cycleDetected ? '#ef4444' : '#3b82f6'}
              strokeWidth={isHighlighted ? 2.5 : 1.5}
              strokeDasharray={edge.isCycleClosing ? '4,4' : undefined}
              strokeOpacity={isHighlighted ? 1 : 0.65}
              markerEnd={`url(#arrow-${id})`}
            />
          );
        })}

        {/* Account Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNode === node.id;
          const nodeColor = cycleDetected ? '#ef4444' : '#3b82f6';

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              {/* Pulse / halo on hover */}
              {isHovered && (
                <circle
                  r="24"
                  fill="none"
                  stroke={nodeColor}
                  strokeWidth="2"
                  opacity="0.4"
                />
              )}

              {/* Node background circle */}
              <circle
                r="18"
                fill="#0f172a"
                stroke={nodeColor}
                strokeWidth={isHovered ? 2.5 : 1.5}
              />

              {/* Account label */}
              <text
                textAnchor="middle"
                dy="4"
                fill="#f8fafc"
                fontSize="9"
                fontWeight="600"
                fontFamily="JetBrains Mono, monospace"
                pointerEvents="none"
              >
                {node.id}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {cycleDetected ? (
          <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <AlertCircle size={14} /> Directed Circular Ring Detected
          </span>
        ) : (
          <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={14} /> Directed Chain Component
          </span>
        )}
      </div>
    </div>
  );
}
