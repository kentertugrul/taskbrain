import { supabase } from './supabaseService';
import { BrainNode, BrainLink, CreateBrainNodeDTO, UpdateBrainNodeDTO, CreateBrainLinkDTO } from '../BrainTypes';

// ============= Brain Nodes =============

export async function fetchBrainNodes(): Promise<BrainNode[]> {
    const { data, error } = await supabase
        .from('brain_nodes')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching brain nodes:', error);
        throw error;
    }

    return data || [];
}

export async function createBrainNode(nodeData: CreateBrainNodeDTO): Promise<BrainNode> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('brain_nodes')
        .insert({
            user_id: user.id,
            title: nodeData.title,
            description: nodeData.description,
            x: nodeData.x,
            y: nodeData.y,
            color: nodeData.color || '#6366F1',
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating brain node:', error);
        throw error;
    }

    return data;
}

export async function updateBrainNode(nodeId: string, updates: UpdateBrainNodeDTO): Promise<BrainNode> {
    const { data, error } = await supabase
        .from('brain_nodes')
        .update(updates)
        .eq('id', nodeId)
        .select()
        .single();

    if (error) {
        console.error('Error updating brain node:', error);
        throw error;
    }

    return data;
}

export async function deleteBrainNode(nodeId: string): Promise<void> {
    const { error } = await supabase
        .from('brain_nodes')
        .delete()
        .eq('id', nodeId);

    if (error) {
        console.error('Error deleting brain node:', error);
        throw error;
    }
}

// ============= Brain Links =============

export async function fetchBrainLinks(): Promise<BrainLink[]> {
    const { data, error } = await supabase
        .from('brain_links')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching brain links:', error);
        throw error;
    }

    return data || [];
}

export async function createBrainLink(linkData: CreateBrainLinkDTO): Promise<BrainLink> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
        .from('brain_links')
        .insert({
            user_id: user.id,
            source_node_id: linkData.source_node_id,
            target_node_id: linkData.target_node_id,
            label: linkData.label,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating brain link:', error);
        throw error;
    }

    return data;
}

export async function deleteBrainLink(linkId: string): Promise<void> {
    const { error } = await supabase
        .from('brain_links')
        .delete()
        .eq('id', linkId);

    if (error) {
        console.error('Error deleting brain link:', error);
        throw error;
    }
}

export async function restoreBrainNode(node: BrainNode): Promise<BrainNode> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('brain_nodes')
        .insert({
            id: node.id,
            user_id: user.id,
            title: node.title,
            description: node.description,
            x: node.x,
            y: node.y,
            color: node.color,
            created_at: node.created_at,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function restoreBrainLink(link: BrainLink): Promise<BrainLink> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
        .from('brain_links')
        .insert({
            id: link.id,
            user_id: user.id,
            source_node_id: link.source_node_id,
            target_node_id: link.target_node_id,
            label: link.label,
            created_at: link.created_at,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ============= Real-time Subscriptions =============

export function subscribeToBrainNodes(callback: () => void) {
    return supabase
        .channel('brain_nodes_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'brain_nodes' },
            callback
        )
        .subscribe();
}

export function subscribeToBrainLinks(callback: () => void) {
    return supabase
        .channel('brain_links_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'brain_links' },
            callback
        )
        .subscribe();
}
