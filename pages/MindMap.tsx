import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Task, TaskStatus, TaskDecision } from '../types';
import { Brain, ZoomIn, ZoomOut, Maximize2, Briefcase, Home } from 'lucide-react';

interface TaskNode {
  id: string;
  task: Task;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  urgency: number;
  importance: number;
}

const MindMap = () => {
  const { tasks } = useAppContext();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<TaskNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<TaskNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate urgency and importance using AI-like heuristics
  const calculateMetrics = (task: Task): { urgency: number; importance: number } => {
    let urgency = 0.5;
    let importance = task.priorityScore;

    // Urgency based on due date
    if (task.dueAt) {
      const now = Date.now();
      const due = new Date(task.dueAt).getTime();
      const daysUntilDue = (due - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue < 1) urgency = 1.0;
      else if (daysUntilDue < 3) urgency = 0.8;
      else if (daysUntilDue < 7) urgency = 0.6;
      else urgency = 0.3;
    }

    // Status affects urgency
    if (task.status === TaskStatus.IN_PROGRESS) urgency += 0.2;
    if (task.status === TaskStatus.DONE) urgency = 0.1;

    // Decision affects importance
    if (task.decision === TaskDecision.DO) importance += 0.2;
    if (task.decision === TaskDecision.DROP) importance = 0.1;

    // Subtasks increase importance
    if (task.subtasks.length > 0) importance += 0.1;

    return { 
      urgency: Math.min(1, Math.max(0, urgency)), 
      importance: Math.min(1, Math.max(0.1, importance)) 
    };
  };

  // Generate node color based on category (Work vs Personal)
  const getNodeColor = (task: Task): string => {
    if (task.category === 'WORK') {
      return '#6366F1'; // Indigo for Work
    } else if (task.category === 'PERSONAL') {
      return '#EC4899'; // Pink for Personal
    }
    return '#64748B'; // Gray for uncategorized
  };

  // Initialize nodes from tasks
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const newNodes: TaskNode[] = tasks.map((task, i) => {
      const { urgency, importance } = calculateMetrics(task);
      const radius = 20 + (urgency + importance) * 40; // Size based on combined metrics
      
      // Initial position in a spiral
      const angle = (i / tasks.length) * Math.PI * 4;
      const distance = 100 + i * 20;

      return {
        id: task.id,
        task,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        vx: 0,
        vy: 0,
        radius,
        color: getNodeColor(task),
        urgency,
        importance
      };
    });

    setNodes(newNodes);
  }, [tasks]);

  // Physics simulation (simplified force-directed graph)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const animate = () => {
      setNodes(prevNodes => {
        return prevNodes.map((node, i) => {
          let fx = 0, fy = 0;

          // Attract to center
          const dcx = centerX - node.x;
          const dcy = centerY - node.y;
          const distToCenter = Math.sqrt(dcx * dcx + dcy * dcy);
          if (distToCenter > 0) {
            fx += (dcx / distToCenter) * 0.01;
            fy += (dcy / distToCenter) * 0.01;
          }

          // Repel from other nodes
          prevNodes.forEach((other, j) => {
            if (i === j) return;
            const dx = node.x - other.x;
            const dy = node.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = node.radius + other.radius + 10;
            
            if (dist < minDist && dist > 0) {
              const force = (minDist - dist) / dist * 0.5;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          });

          // Apply velocity damping
          const newVx = (node.vx + fx) * 0.9;
          const newVy = (node.vy + fy) * 0.9;

          return {
            ...node,
            x: node.x + newVx,
            y: node.y + newVy,
            vx: newVx,
            vy: newVy
          };
        });
      });
    };

    const interval = setInterval(animate, 30);
    return () => clearInterval(interval);
  }, [nodes.length]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and offset
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw connections (subtasks)
    nodes.forEach(node => {
      if (node.task.subtasks.length > 0) {
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        
        const angle = Math.random() * Math.PI * 2;
        const dist = node.radius + 30;
        const childX = node.x + Math.cos(angle) * dist;
        const childY = node.y + Math.sin(angle) * dist;
        
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(childX, childY);
        ctx.stroke();
      }
    });

    ctx.setLineDash([]);

    // Draw nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode?.id === node.id;
      
      // Shadow
      if (isHovered) {
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 20;
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Border
      ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isHovered ? 3 : 1;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Text (task title - abbreviated)
      if (node.radius > 25) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(14, node.radius / 3)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxChars = Math.floor(node.radius / 4);
        let text = node.task.title;
        if (text.length > maxChars) text = text.substring(0, maxChars) + '...';
        
        ctx.fillText(text, node.x, node.y);
      }
    });

    ctx.restore();
  }, [nodes, hoveredNode, zoom, offset]);

  // Mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - offset.y) / zoom;

    if (isDragging) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({ x: offset.x + dx, y: offset.y + dy });
      setDragStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Check hover
    const hovered = nodes.find(node => {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });

    setHoveredNode(hovered || null);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return; // Don't click if we were dragging

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - offset.x) / zoom;
    const mouseY = (e.clientY - rect.top - offset.y) / zoom;

    // Find clicked node
    const clicked = nodes.find(node => {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });

    if (clicked) {
      // Navigate to tasks page with this task selected/highlighted
      navigate('/tasks', { state: { selectedTaskId: clicked.id } });
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Task Mind Map</h3>
            <p className="text-xs text-slate-400">Size = Urgency + Importance</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Briefcase size={14} className="text-indigo-400" />
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-xs text-slate-300">Work</span>
        </div>
        <div className="flex items-center gap-2">
          <Home size={14} className="text-pink-400" />
          <div className="w-3 h-3 rounded-full bg-pink-500" />
          <span className="text-xs text-slate-300">Personal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-600" />
          <span className="text-xs text-slate-300">Uncategorized</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 italic">Click any node to open</p>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button 
          onClick={handleZoomIn}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} className="text-slate-300" />
        </button>
        <button 
          onClick={handleZoomOut}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} className="text-slate-300" />
        </button>
        <button 
          onClick={handleReset}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="Reset View"
        >
          <Maximize2 size={18} className="text-slate-300" />
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 max-w-sm shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            {hoveredNode.task.category === 'WORK' ? (
              <Briefcase size={16} className="text-indigo-400" />
            ) : hoveredNode.task.category === 'PERSONAL' ? (
              <Home size={16} className="text-pink-400" />
            ) : null}
            <h4 className="font-bold text-white">{hoveredNode.task.title}</h4>
          </div>
          {hoveredNode.task.description && (
            <p className="text-sm text-slate-300 mb-3">{hoveredNode.task.description}</p>
          )}
          <div className="flex gap-4 text-xs">
            <div>
              <span className="text-slate-500">Urgency:</span>
              <span className="text-white font-mono ml-1">{Math.round(hoveredNode.urgency * 100)}%</span>
            </div>
            <div>
              <span className="text-slate-500">Importance:</span>
              <span className="text-white font-mono ml-1">{Math.round(hoveredNode.importance * 100)}%</span>
            </div>
          </div>
          {hoveredNode.task.dueAt && (
            <div className="mt-2 text-xs text-amber-400">
              Due: {new Date(hoveredNode.task.dueAt).toLocaleDateString()}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-indigo-400 flex items-center gap-1">
            <span>→ Click to view details</span>
          </div>
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1400}
        height={800}
        className="w-full h-full cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      />
    </div>
  );
};

export default MindMap;

