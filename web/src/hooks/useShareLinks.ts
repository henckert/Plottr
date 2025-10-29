import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Types
export interface ShareLink {
  id: number;
  layout_id: number;
  slug: string;
  expires_at?: string;
  view_count: number;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
}

export interface ShareLinkCreate {
  layout_id: number;
  expires_at?: string;
}

export interface ShareLinkUpdate {
  expires_at?: string;
}

// API calls
async function fetchShareLinks(layoutId: number): Promise<ShareLink[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/share-links?layout_id=${layoutId}&limit=100`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch share links');
  }

  const result = await response.json();
  return result.data || [];
}

async function createShareLink(data: ShareLinkCreate): Promise<ShareLink> {
  const response = await fetch(`${API_BASE_URL}/api/share-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create share link');
  }

  const result = await response.json();
  return result.data;
}

async function deleteShareLink(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/share-links/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete share link');
  }
}

// Hooks
export function useShareLinks(layoutId: number | null) {
  return useQuery({
    queryKey: ['share-links', layoutId],
    queryFn: () => fetchShareLinks(layoutId!),
    enabled: layoutId !== null,
  });
}

export function useCreateShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShareLink,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['share-links', variables.layout_id] });
      toast.success('Share link created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create share link');
    },
  });
}

export function useDeleteShareLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteShareLink,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share-links'] });
      toast.success('Share link revoked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to revoke share link');
    },
  });
}
