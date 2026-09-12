import { api } from "./client";

const API_URL = import.meta.env.VITE_API_URL as string;

export function uploadFile(file: File): Promise<{ id: string }> {
  return api.upload("/uploads", file);
}

export function fileUrl(fileId: string): string {
  return `${API_URL}/uploads/${fileId}`;
}
