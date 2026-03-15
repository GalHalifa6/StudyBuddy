import api from './client';
import { API_BASE_URL } from './env';
import { FileUpload } from './types';
import type { DocumentPickerAsset } from 'expo-document-picker';

const withFallbackName = (asset: DocumentPickerAsset) =>
  asset.name && asset.name.trim().length
    ? asset.name
    : `upload-${Date.now()}`;

const withFallbackType = (asset: DocumentPickerAsset) => asset.mimeType ?? 'application/octet-stream';

export const filesApi = {
  uploadToGroup: async (groupId: number, asset: DocumentPickerAsset): Promise<FileUpload> => {
    const formData = new FormData();

    formData.append('file', {
      uri: asset.uri,
      name: withFallbackName(asset),
      type: withFallbackType(asset),
    } as any);

    const { data } = await api.post<FileUpload>(`/files/upload/group/${groupId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  },

  listGroupFiles: async (groupId: number): Promise<FileUpload[]> => {
    const { data } = await api.get<FileUpload[]>(`/files/group/${groupId}`);
    return data;
  },

  deleteFile: async (fileId: number): Promise<string> => {
    const { data } = await api.delete<string>(`/files/${fileId}`);
    return data;
  },

  getDownloadUrl: (fileId: number): string => `${API_BASE_URL}/files/download/${fileId}`,

  getViewUrl: (fileId: number): string => `${API_BASE_URL}/files/view/${fileId}`,

  formatFileSize: (bytes: number): string => {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / Math.pow(1024, index);
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[index]}`;
  },
};
