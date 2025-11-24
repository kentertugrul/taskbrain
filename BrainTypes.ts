// Brain Node and Link Types for the relational diagram

export interface BrainNode {
    id: string;
    user_id?: string;
    title: string;
    description?: string;
    x: number;
    y: number;
    color: string;
    created_at: string;
    updated_at?: string;
}

export interface BrainLink {
    id: string;
    user_id?: string;
    source_node_id: string;
    target_node_id: string;
    label?: string;
    created_at: string;
}

export interface BrainDiagramState {
    nodes: BrainNode[];
    links: BrainLink[];
    selectedNodeId: string | null;
    viewBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    zoom: number;
}

export interface CreateBrainNodeDTO {
    title: string;
    description?: string;
    x: number;
    y: number;
    color?: string;
}

export interface UpdateBrainNodeDTO {
    title?: string;
    description?: string;
    x?: number;
    y?: number;
    color?: string;
}

export interface CreateBrainLinkDTO {
    source_node_id: string;
    target_node_id: string;
    label?: string;
}
