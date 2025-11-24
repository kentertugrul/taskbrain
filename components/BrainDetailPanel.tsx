import React, { useState, useEffect } from 'react';
import { BrainNode } from '../BrainTypes';
import { X, Trash2, Link as LinkIcon } from 'lucide-react';

interface BrainDetailPanelProps {
    node: BrainNode | null;
    connectedNodes: { node: BrainNode; label?: string }[];
    onClose: () => void;
    onUpdate: (nodeId: string, updates: { title?: string; description?: string; color?: string }) => void;
    onDelete: (nodeId: string) => void;
    onNavigateToNode: (nodeId: string) => void;
}

const BrainDetailPanel: React.FC<BrainDetailPanelProps> = ({
    node,
    connectedNodes,
    onClose,
    onUpdate,
    onDelete,
    onNavigateToNode,
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#6366F1');
    const titleInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (node) {
            setTitle(node.title);
            setDescription(node.description || '');
            setColor(node.color);
            // Auto-focus title input when node changes
            setTimeout(() => {
                titleInputRef.current?.focus();
            }, 50);
        }
    }, [node?.id]); // Only re-run when switching nodes

    if (!node) return null;

    const handleSave = () => {
        onUpdate(node.id, { title, description, color });
    };

    const handleSaveAndClose = () => {
        handleSave();
        onClose();
    };

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this node and all its connections?')) {
            onDelete(node.id);
            onClose();
        }
    };

    const colorPresets = [
        '#6366F1', // Indigo
        '#EC4899', // Pink
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#8B5CF6', // Violet
        '#EF4444', // Red
        '#3B82F6', // Blue
        '#14B8A6', // Teal
    ];

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slide-in-right">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Node Details</h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <X size={20} className="text-slate-400" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Title
                    </label>
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSave}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Node title"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Description
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleSave}
                        rows={4}
                        className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Add a description..."
                    />
                </div>

                {/* Color Picker */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                        Color
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {colorPresets.map((preset) => (
                            <button
                                key={preset}
                                onClick={() => {
                                    setColor(preset);
                                    onUpdate(node.id, { color: preset });
                                }}
                                className={`w-full h-10 rounded-lg transition-all ${color === preset
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                                    : 'hover:scale-105'
                                    }`}
                                style={{ backgroundColor: preset }}
                            />
                        ))}
                    </div>
                </div>

                {/* Connected Nodes */}
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                        <LinkIcon size={16} />
                        Connected Nodes ({connectedNodes.length})
                    </label>
                    <div className="space-y-2">
                        {connectedNodes.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No connections yet</p>
                        ) : (
                            connectedNodes.map(({ node: connectedNode, label }) => (
                                <button
                                    key={connectedNode.id}
                                    onClick={() => onNavigateToNode(connectedNode.id)}
                                    className="w-full p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: connectedNode.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate group-hover:text-indigo-300">
                                                {connectedNode.title}
                                            </p>
                                            {label && (
                                                <p className="text-xs text-slate-400 truncate">{label}</p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 flex gap-3">
                <button
                    onClick={handleSaveAndClose}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
                >
                    Save & Close
                </button>
                <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-600/20 rounded-lg transition-colors"
                    title="Delete Node"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
};

export default BrainDetailPanel;
