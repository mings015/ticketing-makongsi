import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { uuidv7 } from 'uuidv7';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type UploadResult = {
  storedName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
};

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

export async function saveFile(file: File): Promise<UploadResult> {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const mimeType = file.type;
  const ext = MIME_TO_EXT[mimeType] ?? 'bin';
  const storedName = `${uuidv7()}.${ext}`;
  const filePath = join(UPLOADS_DIR, storedName);

  const arrayBuffer = await file.arrayBuffer();
  await Bun.write(filePath, arrayBuffer);

  const apiBase = process.env.API_URL ?? 'http://localhost:3000';
  const fileUrl = `${apiBase}/uploads/${storedName}`;

  return {
    storedName,
    fileUrl,
    fileSize: file.size,
    mimeType,
  };
}

export async function deleteFile(storedName: string): Promise<void> {
  const filePath = join(UPLOADS_DIR, storedName);
  try {
    await Bun.file(filePath).text();
    const { unlink } = await import('node:fs/promises');
    await unlink(filePath);
  } catch {
    // File may not exist — ignore
  }
}
