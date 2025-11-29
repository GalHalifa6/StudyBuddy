import api from './axios';
import { FileUpload } from '../types';

export const fileService = {
  uploadFile: async (groupId: number, file: File): Promise<FileUpload> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<FileUpload>(`/files/upload/group/${groupId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getGroupFiles: async (groupId: number): Promise<FileUpload[]> => {
    const response = await api.get<FileUpload[]>(`/files/group/${groupId}`);
    return response.data;
  },

  getFileInfo: async (fileId: number): Promise<FileUpload> => {
    const response = await api.get<FileUpload>(`/files/info/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: number): Promise<Blob> => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteFile: async (fileId: number): Promise<string> => {
    const response = await api.delete<string>(`/files/${fileId}`);
    return response.data;
  },

  // Helper to get download URL
  getDownloadUrl: (fileId: number): string => {
    return `http://localhost:8080/api/files/download/${fileId}`;
  },

  // Helper to get view URL (for inline viewing like images/PDFs)
  getViewUrl: (fileId: number): string => {
    return `http://localhost:8080/api/files/view/${fileId}`;
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get file icon based on file type
  getFileIcon: (fileType: string): string => {
    if (fileType?.includes('pdf')) return 'pdf';
    if (fileType?.includes('word') || fileType?.includes('document')) return 'doc';
    if (fileType?.includes('sheet') || fileType?.includes('excel')) return 'xls';
    if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'ppt';
    if (fileType?.includes('image')) return 'image';
    if (fileType?.includes('zip') || fileType?.includes('rar') || fileType?.includes('7z')) return 'zip';
    if (fileType?.includes('text')) return 'txt';
    return 'file';
  },
};
