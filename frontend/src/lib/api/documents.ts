import { apiFetch } from './client';
import type { DocumentItem, Paginated } from './types';

export const listDocuments = (page = 1, pageSize = 20) =>
  apiFetch<Paginated<DocumentItem>>(`/documents?page=${page}&pageSize=${pageSize}`);

export interface UploadIntentInput {
  title: string;
  mimeType: string;
  sizeBytes: number;
  category?: string;
  ownerEmployeeId?: string;
  expiresAt?: string;
}

export const createUploadIntent = (input: UploadIntentInput) =>
  apiFetch<{ uploadUrl: string; objectKey: string }>('/documents/upload-intent', {
    method: 'POST',
    body: input,
  });

export const confirmUpload = (input: UploadIntentInput & { objectKey: string }) =>
  apiFetch<DocumentItem>('/documents/confirm', { method: 'POST', body: input });

export const getDownloadUrl = (id: string) =>
  apiFetch<{ url: string }>(`/documents/${id}/download`);

export const deleteDocument = (id: string) =>
  apiFetch<void>(`/documents/${id}`, { method: 'DELETE' });
