import React from 'react';
import { BrainNode as BrainNodeType } from '../BrainTypes';
import { Plus } from 'lucide-react';

interface BrainNodeProps {
    node: BrainNodeType;
    isSelected: boolean;
    onSelect: (nodeId: string) => void;
    onDragStart: (nodeId: string, e: React.MouseEvent) => void;
    onHandleDragStart: (nodeId: string, position: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => void;
    scale: number;
}

const BrainNode: React.FC<BrainNodeProps> = ({
    node,
    isSelected,
    onSelect,
    onDragStart,
    onHandleDragStart,
    scale
}) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const radius = 50;
    const handleSize = 12;
    const handleOffset = radius + 8;

    const handlePositions = {
        top: { x: node.x, y: node.y - handleOffset },
        right: { x: node.x + handleOffset, y: node.y },
        bottom: { x: node.x, y: node.y + handleOffset },
        left: { x: node.x - handleOffset, y: node.y },
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect(node.id);
        onDragStart(node.id, e);
    };

    const handleHandleMouseDown = (position: 'top' | 'right' | 'bottom' | 'left') => (e: React.MouseEvent) => {
        e.stopPropagation();
        onHandleDragStart(node.id, position, e);
    };

    const showHandles = isSelected || isHovered;

    return (
        <g
            className="brain-node"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Invisible Hit Area (prevents flickering when moving to handles) */}
            <circle
                cx={node.x}
                cy={node.y}
                r={radius + 20}
                fill="transparent"
            />

            {/* Main Node Circle */}
            <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={node.color}
                stroke={isSelected ? '#fff' : 'rgba(255, 255, 255, 0.3)'}
                strokeWidth={isSelected ? 3 : 2}
                className="cursor-move transition-all hover:brightness-110"
                onMouseDown={handleMouseDown}
                style={{
                    filter: isSelected ? `drop-shadow(0 0 20px ${node.color})` : 'none',
                }}
            />

            {/* Node Title */}
            <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize={14}
                fontWeight="600"
                className="pointer-events-none select-none"
                style={{ userSelect: 'none' }}
            >
                {node.title.length > 12 ? node.title.substring(0, 12) + '...' : node.title}
            </text>

            {/* Connection Handles */}
            {showHandles && (
                <>
                    {(['top', 'right', 'bottom', 'left'] as const).map((position) => (
                        <g key={position}>
                            {/* Handle Hit Area (Larger invisible target) */}
                            <circle
                                cx={handlePositions[position].x}
                                cy={handlePositions[position].y}
                                r={handleSize + 5}
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseDown={handleHandleMouseDown(position)}
                            />
                            {/* Visible Handle Circle */}
                            <circle
                                cx={handlePositions[position].x}
                                cy={handlePositions[position].y}
                                r={handleSize}
                                fill="#10b981"
                                stroke="#fff"
                                strokeWidth={2}
                                className="pointer-events-none" // Events handled by hit area
                                style={{
                                    filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))',
                                }}
                            />
                            {/* Plus Icon */}
                            <text
                                x={handlePositions[position].x}
                                y={handlePositions[position].y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={12}
                                fontWeight="bold"
                                className="pointer-events-none select-none"
                                style={{ userSelect: 'none' }}
                            >
                                +
                            </text>
                        </g>
                    ))}
                </>
            )}
        </g>
    );
};

export default BrainNode;
