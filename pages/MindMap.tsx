import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../App';
import { Task, TaskStatus, TaskDecision } from '../types';
import { Brain, ZoomIn, ZoomOut, Maximize2, Briefcase, Home, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TaskNode {
  id: string;
  task: Task;
  x: number;
  y: number;
  radius: number;
  color: string;
  urgency: number;
  importance: number;
}

interface Lane {
  id: string;
  label: string;
  color: string;
  y: number;
  height: number;
}

const MindMap = () => {
  const { tasks } = useAppContext();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<TaskNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Configuration
  const LANE_HEIGHT = 200;
  const HEADER_HEIGHT = 60;
  const TIME_AXIS_HEIGHT = 60;
  const PADDING_X = 100;

  // Calculate urgency and importance
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

    return {
      urgency: Math.min(1, Math.max(0.1, urgency)),
      importance: Math.min(1, Math.max(0.1, importance))
    };
  };

  const getNodeColor = (task: Task): string => {
    if (task.category === 'WORK') return '#6366F1'; // Indigo
    if (task.category === 'PERSONAL') return '#EC4899'; // Pink
    return '#64748B'; // Gray
  };

  // Define Lanes
  const lanes: Lane[] = [
    { id: 'WORK', label: 'Work', color: '#6366F1', y: HEADER_HEIGHT, height: LANE_HEIGHT },
    { id: 'PERSONAL', label: 'Personal', color: '#EC4899', y: HEADER_HEIGHT + LANE_HEIGHT, height: LANE_HEIGHT },
    { id: 'UNCATEGORIZED', label: 'Uncategorized', color: '#64748B', y: HEADER_HEIGHT + LANE_HEIGHT * 2, height: LANE_HEIGHT },
  ];

  // Calculate time range and nodes
  const { nodes, timeStart, timeEnd, totalWidth } = useMemo(() => {
    if (tasks.length === 0) return { nodes: [], timeStart: Date.now(), timeEnd: Date.now(), totalWidth: 1000 };

    // Find time range based on createdAt
    const dates = tasks.map(t => new Date(t.createdAt).getTime());
    let minTime = Math.min(...dates);
    let maxTime = Math.max(...dates);

    // Add buffer
    const dayMs = 86400000;
    minTime -= dayMs * 2;
    maxTime += dayMs * 2;

    // Ensure minimum width
    if (maxTime - minTime < dayMs * 7) maxTime = minTime + dayMs * 7;

    const width = Math.max(1200, (maxTime - minTime) / (dayMs / 50)); // 50px per day approx

    const calculatedNodes: TaskNode[] = tasks.map(task => {
      const { urgency, importance } = calculateMetrics(task);

      // X position based on time
      const time = new Date(task.createdAt).getTime();
      const timeRatio = (time - minTime) / (maxTime - minTime);
      const x = PADDING_X + timeRatio * (width - PADDING_X * 2);

      // Y position based on lane + random jitter to avoid overlap
      let lane = lanes.find(l => l.id === task.category) || lanes.find(l => l.id === 'UNCATEGORIZED')!;

      // Simple collision avoidance (jitter)
      // Ideally we'd use a force layout constrained to Y, but random Y within lane is a good start
      const laneContentHeight = lane.height - 60; // Padding
      const y = lane.y + 30 + Math.random() * laneContentHeight;

      // Size based on urgency
      const radius = 15 + urgency * 35;

      return {
        id: task.id,
        task,
        x,
        y,
        radius,
        color: getNodeColor(task),
        urgency,
        importance
      };
    });

    return { nodes: calculatedNodes, timeStart: minTime, timeEnd: maxTime, totalWidth: width };
  }, [tasks]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#020617'; // Slate 950
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();

    // Apply transform
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);

    // Draw Lanes
    lanes.forEach((lane, i) => {
      // Lane Background
      ctx.fillStyle = i % 2 === 0 ? 'rgba(30, 41, 59, 0.3)' : 'rgba(15, 23, 42, 0.3)';
      ctx.fillRect(0, lane.y, totalWidth, lane.height);

      // Lane Separator
      ctx.beginPath();
      ctx.moveTo(0, lane.y);
      ctx.lineTo(totalWidth, lane.y);
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Lane Label
      ctx.fillStyle = lane.color;
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(lane.label, 20, lane.y + 20);
    });

    // Draw Time Axis (Bottom)
    const axisY = lanes[lanes.length - 1].y + lanes[lanes.length - 1].height;
    ctx.beginPath();
    ctx.moveTo(0, axisY);
    ctx.lineTo(totalWidth, axisY);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Time ticks
    const timeSpan = timeEnd - timeStart;
    const dayMs = 86400000;
    const days = Math.ceil(timeSpan / dayMs);
    const tickInterval = Math.max(1, Math.floor(days / 10)); // Show ~10 ticks

    for (let i = 0; i <= days; i += tickInterval) {
      const time = timeStart + i * dayMs;
      const timeRatio = (time - timeStart) / timeSpan;
      const x = PADDING_X + timeRatio * (totalWidth - PADDING_X * 2);

      ctx.beginPath();
      ctx.moveTo(x, axisY);
      ctx.lineTo(x, axisY + 10);
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(format(new Date(time), 'MMM d'), x, axisY + 15);
    }

    // Draw Nodes
    nodes.forEach(node => {
      const isHovered = hoveredNode?.id === node.id;

      // Connection lines (optional, maybe for subtasks later)

      // Node Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      // Border
      ctx.strokeStyle = isHovered ? '#fff' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isHovered ? 3 : 1;
      ctx.stroke();

      // Glow if hovered
      if (isHovered) {
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 20;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Label if large enough
      if (node.radius > 20 || isHovered) {
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.min(14, node.radius / 2.5)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const maxChars = Math.floor(node.radius / 3);
        let text = node.task.title;
        if (!isHovered && text.length > maxChars) text = text.substring(0, maxChars) + '..';

        ctx.fillText(text, node.x, node.y);
      }
    });

    ctx.restore();

  }, [nodes, lanes, totalWidth, timeStart, timeEnd, offset, zoom, hoveredNode]);

  // Interaction Handlers
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Adjust for DPR in coordinate calculation if needed, but usually clientX is logical pixels
    // We scaled the context, so logical coords should map if we inverse transform
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
    // We need to check in reverse order (topmost first) if they overlap, but here simple find is okay
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

  const handleMouseUp = () => setIsDragging(false);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    if (hoveredNode) {
      navigate('/tasks', { state: { selectedTaskId: hoveredNode.id } });
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
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Clock size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Task Timeline</h3>
            <p className="text-xs text-slate-400">X-Axis: Time • Size: Urgency</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex gap-2">
        <button onClick={handleZoomIn} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ZoomIn size={18} className="text-slate-300" />
        </button>
        <button onClick={handleZoomOut} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ZoomOut size={18} className="text-slate-300" />
        </button>
        <button onClick={handleReset} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Maximize2 size={18} className="text-slate-300" />
        </button>
      </div>

      {/* Tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 max-w-sm shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
            <h4 className="font-bold text-white">{hoveredNode.task.title}</h4>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Created: {format(new Date(hoveredNode.task.createdAt), 'PP')}</p>
            <p>Urgency: {Math.round(hoveredNode.urgency * 100)}%</p>
            {hoveredNode.task.dueAt && <p className="text-amber-400">Due: {format(new Date(hoveredNode.task.dueAt), 'PP')}</p>}
          </div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
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

