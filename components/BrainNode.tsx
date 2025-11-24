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
    visualScale?: number;
    isEditing?: boolean;
    onEditEnd?: (newTitle: string) => void;
    onDoubleClick?: (nodeId: string) => void;
}

const BrainNode: React.FC<BrainNodeProps> = ({
    node,
    isSelected,
    onSelect,
    onDragStart,
    onHandleDragStart,
    scale,
    visualScale = 1, // Default to 1 if not provided
    isEditing = false,
    onEditEnd,
    onDoubleClick
}: BrainNodeProps & {
    visualScale?: number;
    isEditing?: boolean;
    onEditEnd?: (newTitle: string) => void;
    onDoubleClick?: (nodeId: string) => void;
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
            className="brain-node transition-transform duration-500 ease-in-out"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            transform={`translate(${node.x}, ${node.y}) scale(${visualScale}) translate(${-node.x}, ${-node.y})`}
            onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClick?.(node.id);
            }}
        >
            {/* Invisible Hit Area (prevents flickering when moving to handles) */}
            <circle
                cx={node.x}
                cy={node.y}
                r={radius + 20}
                fill="transparent"
                onMouseDown={handleMouseDown}
            />

            {/* Main Node Circle */}
            <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={node.color}
                className={`transition-all duration-300 ${isSelected ? 'stroke-white stroke-2' : 'stroke-none'} shadow-lg`}
                onMouseDown={handleMouseDown}
                style={{ filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.3))' }}
            />

            {/* Node Content */}
            {isEditing ? (
                <foreignObject
                    x={node.x - 40}
                    y={node.y - 40}
                    width="80"
                    height="80"
                    className="overflow-visible"
                >
                    <textarea
                        autoFocus
                        defaultValue={node.title}
                        onBlur={(e) => onEditEnd?.(e.target.value)}
                        onKeyDown={(e) => {
                            e.stopPropagation(); // Prevent global backspace/delete
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                e.currentTarget.blur();
                            }
                            if (e.key === 'Escape') onEditEnd?.(node.title);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            height: '100%',
                            background: 'transparent',
                            color: 'white',
                            border: 'none',
                            textAlign: 'center',
                            outline: 'none',
                            fontSize: '12px',
                            fontWeight: '500',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            resize: 'none',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    />
                </foreignObject>
            ) : (
                <foreignObject
                    x={node.x - 40}
                    y={node.y - 40}
                    width="80"
                    height="80"
                    className="pointer-events-none"
                >
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            wordWrap: 'break-word',
                            lineHeight: '1.2',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            userSelect: 'none'
                        }}
                    >
                        {node.title}
                    </div>
                </foreignObject>
            )}

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
