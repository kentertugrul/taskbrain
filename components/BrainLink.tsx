import React from 'react';
import { BrainLink as BrainLinkType, BrainNode } from '../BrainTypes';

interface BrainLinkProps {
    link: BrainLinkType;
    sourceNode: BrainNode | undefined;
    targetNode: BrainNode | undefined;
    isSelected: boolean;
    onSelect: (linkId: string) => void;
}

const BrainLink: React.FC<BrainLinkProps> = ({
    link,
    sourceNode,
    targetNode,
    isSelected,
    onSelect,
}) => {
    if (!sourceNode || !targetNode) return null;

    // Calculate control points for bezier curve
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Control point offset (creates the curve)
    const offset = Math.min(distance * 0.3, 100);

    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;

    // Perpendicular offset for curve
    const perpX = -dy / distance * offset;
    const perpY = dx / distance * offset;

    const controlX = midX + perpX;
    const controlY = midY + perpY;

    const path = `M ${sourceNode.x} ${sourceNode.y} Q ${controlX} ${controlY} ${targetNode.x} ${targetNode.y}`;

    // Calculate label position at curve midpoint
    const t = 0.5;
    const labelX = (1 - t) * (1 - t) * sourceNode.x + 2 * (1 - t) * t * controlX + t * t * targetNode.x;
    const labelY = (1 - t) * (1 - t) * sourceNode.y + 2 * (1 - t) * t * controlY + t * t * targetNode.y;

    return (
        <g className="brain-link">
            {/* Invisible wider path for easier clicking */}
            <path
                d={path}
                fill="none"
                stroke="transparent"
                strokeWidth={20}
                className="cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(link.id);
                }}
            />

            {/* Visible path */}
            <path
                d={path}
                fill="none"
                stroke={isSelected ? '#10b981' : '#64748b'}
                strokeWidth={isSelected ? 3 : 2}
                className="pointer-events-none transition-all"
                markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'normal'})`}
                style={{
                    filter: isSelected ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))' : 'none',
                }}
            />

            {/* Label */}
            {link.label && (
                <g>
                    <rect
                        x={labelX - 30}
                        y={labelY - 10}
                        width={60}
                        height={20}
                        rx={4}
                        fill="#1e293b"
                        stroke="#475569"
                        strokeWidth={1}
                        className="pointer-events-none"
                    />
                    <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#94a3b8"
                        fontSize={10}
                        className="pointer-events-none select-none"
                        style={{ userSelect: 'none' }}
                    >
                        {link.label.length > 8 ? link.label.substring(0, 8) + '...' : link.label}
                    </text>
                </g>
            )}
        </g>
    );
};

// Arrow marker definitions (to be included in SVG defs)
export const LinkMarkerDefs = () => (
    <defs>
        <marker
            id="arrowhead-normal"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
        >
            <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
        <marker
            id="arrowhead-selected"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
            markerUnits="strokeWidth"
        >
            <path d="M0,0 L0,6 L9,3 z" fill="#10b981" />
        </marker>
    </defs>
);

export default BrainLink;
