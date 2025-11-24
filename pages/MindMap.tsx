import React, { useEffect, useState, useRef } from 'react';
import { BrainNode as BrainNodeType, BrainLink as BrainLinkType, CreateBrainNodeDTO } from '../BrainTypes';
import BrainNode from '../components/BrainNode';
import BrainLink, { LinkMarkerDefs } from '../components/BrainLink';
import BrainDetailPanel from '../components/BrainDetailPanel';
import * as BrainService from '../services/brainService';
import { Plus, ZoomIn, ZoomOut, Maximize2, Network } from 'lucide-react';

const MindMap = () => {
  const [nodes, setNodes] = useState<BrainNodeType[]>([]);
  const [links, setLinks] = useState<BrainLinkType[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drag state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Handle drag state (for creating connections)
  const [handleDragState, setHandleDragState] = useState<{
    nodeId: string;
    position: 'top' | 'right' | 'bottom' | 'left';
    startX: number;
    startY: number;
  } | null>(null);
  const [tempLinkEnd, setTempLinkEnd] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load data from Supabase
  useEffect(() => {
    loadData();

    // Subscribe to real-time updates
    const nodesSubscription = BrainService.subscribeToBrainNodes(() => {
      console.log('🔄 Brain nodes updated');
      loadData();
    });

    const linksSubscription = BrainService.subscribeToBrainLinks(() => {
      console.log('🔄 Brain links updated');
      loadData();
    });

    return () => {
      nodesSubscription.unsubscribe();
      linksSubscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      const [fetchedNodes, fetchedLinks] = await Promise.all([
        BrainService.fetchBrainNodes(),
        BrainService.fetchBrainLinks(),
      ]);
      setNodes(fetchedNodes);
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('Error loading brain data:', error);
    }
  };

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = (screenX: number, screenY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - pan.x) / zoom;
    const y = (screenY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Node CRUD operations
  const handleAddNode = async () => {
    const centerX = (containerRef.current?.clientWidth || 800) / 2 / zoom - pan.x / zoom;
    const centerY = (containerRef.current?.clientHeight || 600) / 2 / zoom - pan.y / zoom;

    const newNodeData: CreateBrainNodeDTO = {
      title: 'New Thought',
      description: '',
      x: centerX,
      y: centerY,
      color: '#6366F1',
    };

    try {
      const newNode = await BrainService.createBrainNode(newNodeData);
      setNodes([...nodes, newNode]);
      setSelectedNodeId(newNode.id);
    } catch (error: any) {
      console.error('Error creating node:', error);
      alert(`Failed to create node: ${error.message || 'Unknown error'}. Did you run the database migrations?`);
    }
  };

  const handleUpdateNode = async (nodeId: string, updates: { title?: string; description?: string; color?: string }) => {
    try {
      await BrainService.updateBrainNode(nodeId, updates);
      setNodes(nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n));
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await BrainService.deleteBrainNode(nodeId);
      setNodes(nodes.filter(n => n.id !== nodeId));
      setLinks(links.filter(l => l.source_node_id !== nodeId && l.target_node_id !== nodeId));
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  // Node drag handlers
  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const svgCoords = screenToSVG(e.clientX, e.clientY);
    setDraggedNodeId(nodeId);
    setDragOffset({
      x: svgCoords.x - node.x,
      y: svgCoords.y - node.y,
    });
  };

  // Handle drag handlers (for creating connections)
  const handleHandleDragStart = (nodeId: string, position: 'top' | 'right' | 'bottom' | 'left', e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setHandleDragState({
      nodeId,
      position,
      startX: node.x,
      startY: node.y,
    });
    setTempLinkEnd(screenToSVG(e.clientX, e.clientY));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const svgCoords = screenToSVG(e.clientX, e.clientY);

    // Handle node dragging
    if (draggedNodeId) {
      const newX = svgCoords.x - dragOffset.x;
      const newY = svgCoords.y - dragOffset.y;

      setNodes(nodes.map(n =>
        n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n
      ));
    }

    // Handle connection creation
    else if (handleDragState) {
      setTempLinkEnd(svgCoords);
    }

    // Handle panning
    else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setPan({ x: pan.x + dx, y: pan.y + dy });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = async (e: React.MouseEvent) => {
    // Finish node dragging
    if (draggedNodeId) {
      const node = nodes.find(n => n.id === draggedNodeId);
      if (node) {
        try {
          await BrainService.updateBrainNode(draggedNodeId, { x: node.x, y: node.y });
        } catch (error) {
          console.error('Error updating node position:', error);
        }
      }
      setDraggedNodeId(null);
    }

    // Finish handle dragging (create link or new node)
    else if (handleDragState && tempLinkEnd) {
      const svgCoords = screenToSVG(e.clientX, e.clientY);

      // Check if we're over another node
      const targetNode = nodes.find(n => {
        if (n.id === handleDragState.nodeId) return false;
        const dx = n.x - svgCoords.x;
        const dy = n.y - svgCoords.y;
        return Math.sqrt(dx * dx + dy * dy) < 50; // 50 is the node radius
      });

      if (targetNode) {
        // Create link to existing node
        try {
          const newLink = await BrainService.createBrainLink({
            source_node_id: handleDragState.nodeId,
            target_node_id: targetNode.id,
          });
          setLinks([...links, newLink]);
        } catch (error) {
          console.error('Error creating link:', error);
        }
      } else {
        // Create new node at drop location
        try {
          const newNode = await BrainService.createBrainNode({
            title: 'New Thought',
            description: '',
            x: svgCoords.x,
            y: svgCoords.y,
            color: '#6366F1',
          });

          const newLink = await BrainService.createBrainLink({
            source_node_id: handleDragState.nodeId,
            target_node_id: newNode.id,
          });

          setNodes([...nodes, newNode]);
          setLinks([...links, newLink]);
          setSelectedNodeId(newNode.id);
        } catch (error) {
          console.error('Error creating node and link:', error);
        }
      }

      setHandleDragState(null);
      setTempLinkEnd(null);
    }

    setIsPanning(false);
  };

  const handleBackgroundMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).classList.contains('background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedNodeId(null);
      setSelectedLinkId(null);
    }
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(Math.min(zoom * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom / 1.2, 0.3));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const centerNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const newPanX = (containerWidth / (2 * zoom)) - node.x;
    const newPanY = (containerHeight / (2 * zoom)) - node.y;

    setPan({ x: newPanX, y: newPanY });
  };

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    centerNode(nodeId);
  };

  // Get connected nodes for detail panel
  const getConnectedNodes = (nodeId: string) => {
    const connected: { node: BrainNodeType; label?: string }[] = [];

    links.forEach(link => {
      if (link.source_node_id === nodeId) {
        const node = nodes.find(n => n.id === link.target_node_id);
        if (node) connected.push({ node, label: link.label });
      } else if (link.target_node_id === nodeId) {
        const node = nodes.find(n => n.id === link.source_node_id);
        if (node) connected.push({ node, label: link.label });
      }
    });

    return connected;
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div ref={containerRef} className="relative w-full h-[calc(100vh-12rem)] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Network size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Brain Diagram</h3>
            <p className="text-xs text-slate-400">{nodes.length} nodes • {links.length} connections</p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={handleAddNode}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-lg"
        >
          <Plus size={18} />
          Add Node
        </button>
        <button onClick={handleZoomIn} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ZoomIn size={18} className="text-slate-300" />
        </button>
        <button onClick={handleZoomOut} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <ZoomOut size={18} className="text-slate-300" />
        </button>
        <button onClick={handleResetView} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 p-2 rounded-lg hover:bg-slate-800 transition-colors">
          <Maximize2 size={18} className="text-slate-300" />
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleBackgroundMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <LinkMarkerDefs />

        {/* Background */}
        <rect className="background" width="100%" height="100%" fill="#020617" />

        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#1e293b" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" opacity="0.5" />

        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          className="transition-transform duration-500 ease-in-out"
        >
          {/* Render Links */}
          {links.map(link => (
            <BrainLink
              key={link.id}
              link={link}
              sourceNode={nodes.find(n => n.id === link.source_node_id)}
              targetNode={nodes.find(n => n.id === link.target_node_id)}
              isSelected={selectedLinkId === link.id}
              onSelect={setSelectedLinkId}
            />
          ))}

          {/* Temporary link while dragging */}
          {handleDragState && tempLinkEnd && (
            <line
              x1={handleDragState.startX}
              y1={handleDragState.startY}
              x2={tempLinkEnd.x}
              y2={tempLinkEnd.y}
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5,5"
              className="pointer-events-none"
            />
          )}

          {/* Render Nodes */}
          {nodes.map(node => (
            <BrainNode
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={handleNodeSelect}
              onDragStart={handleNodeDragStart}
              onHandleDragStart={handleHandleDragStart}
              scale={zoom}
              visualScale={selectedNodeId ? (selectedNodeId === node.id ? 1.1 : 0.6) : 1}
            />
          ))}
        </g>
      </svg>

      {/* Detail Panel */}
      {selectedNode && (
        <BrainDetailPanel
          node={selectedNode}
          connectedNodes={getConnectedNodes(selectedNode.id)}
          onClose={() => setSelectedNodeId(null)}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
          onNavigateToNode={setSelectedNodeId}
        />
      )}

      {/* Empty State */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <Network size={48} className="text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400 mb-2">Start Your Brain Map</h3>
            <p className="text-slate-500 mb-4">Click "Add Node" to create your first thought</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MindMap;
