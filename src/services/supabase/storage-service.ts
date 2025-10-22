"use server";

import { createClient } from "@/lib/supabase/server";
import logger from "lib/logger";

// Types
export interface FileInfo {
  name: string;
  id: string | null;
  updated_at: string | null;
  created_at: string | null;
  last_accessed_at: string | null;
  metadata: Record<string, any>;
  buckets: {
    id: string;
    name: string;
    owner: string | null;
    created_at: string | null;
    updated_at: string | null;
    public: boolean;
  } | null;
}

export interface FileMetadata {
  eTag: string | null;
  size: number | null;
  mimetype: string | null;
  cacheControl: string | null;
  lastModified: string | null;
  contentLength: number | null;
  httpStatusCode: number | null;
}

export interface UploadResult {
  path: string;
  url: string;
  id?: string;
}

// Constants
const DEFAULT_BUCKET = "user-uploads";
const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";
const PUBLIC_ASSETS_BUCKET = "public-assets";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file type and size
 */
function validateFile(file: File): { isValid: boolean; error?: string } {
  if (!file) {
    return { isValid: false, error: "No file provided" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { isValid: true };
}

/**
 * Uploads a file to Supabase Storage
 */
export async function uploadFile(
  userId: string,
  file: File,
  path: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<UploadResult> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const supabase = await createClient();

  // Generate unique filename with timestamp and random suffix
  const fileExt = file.name.split(".").pop();
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `${timestamp}_${randomSuffix}.${fileExt}`;

  // Create full path with user ID for security
  const fullPath = `users/${userId}/${path}/${uniqueFileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      logger.error("File upload failed", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
      id: data.id,
    };
  } catch (error) {
    logger.error("Upload error", error);
    throw error;
  }
}

/**
 * Uploads a file from buffer to Supabase Storage
 */
export async function uploadFileFromBuffer(
  userId: string,
  buffer: Buffer,
  path: string,
  mimeType: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<UploadResult> {
  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File type ${mimeType} is not allowed`);
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  const supabase = await createClient();

  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `${timestamp}_${randomSuffix}.${mimeType.split("/")[1] || "bin"}`;

  // Create full path with user ID for security
  const fullPath = `users/${userId}/${path}/${uniqueFileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: mimeType,
      });

    if (error) {
      logger.error("Buffer upload failed", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      url: urlData.publicUrl,
      id: data.id,
    };
  } catch (error) {
    logger.error("Buffer upload error", error);
    throw error;
  }
}

/**
 * Gets a signed upload URL for direct client-side uploads
 */
export async function getSignedUploadUrl(
  userId: string,
  path: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<{ uploadUrl: string; path: string }> {
  const supabase = await createClient();

  // Generate unique filename
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `${timestamp}_${randomSuffix}`;

  // Create full path with user ID for security
  const fullPath = `users/${userId}/${path}/${uniqueFileName}`;

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(fullPath);

    if (error) {
      logger.error("Signed URL creation failed", error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return {
      uploadUrl: data.signedUrl,
      path: data.path,
    };
  } catch (error) {
    logger.error("Signed URL error", error);
    throw error;
  }
}

/**
 * Gets a signed download URL for a file
 */
export async function getSignedDownloadUrl(
  path: string,
  bucket: string = DEFAULT_BUCKET,
  expiresIn: number = 3600,
): Promise<string> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      logger.error("Signed download URL creation failed", error);
      throw new Error(`Failed to create signed download URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    logger.error("Signed download URL error", error);
    throw error;
  }
}

/**
 * Deletes a file from storage
 */
export async function deleteFile(
  path: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      logger.error("File deletion failed", error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  } catch (error) {
    logger.error("Delete error", error);
    throw error;
  }
}

/**
 * Lists files in a directory
 */
export async function listFiles(
  userId: string,
  prefix: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<FileInfo[]> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(`users/${userId}/${prefix}`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      logger.error("File listing failed", error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    logger.error("List files error", error);
    throw error;
  }
}

/**
 * Gets file metadata
 */
export async function getFileMetadata(
  userId: string,
  path: string,
  bucket: string = DEFAULT_BUCKET,
): Promise<FileMetadata> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(`users/${userId}`, {
        limit: 1,
        search: path.split("/").pop(), // Search for filename
      });

    if (error) {
      logger.error("Metadata fetch failed", error);
      throw new Error(`Failed to get metadata: ${error.message}`);
    }

    const file = data?.find((f) => f.name === path.split("/").pop());
    if (!file) {
      throw new Error("File not found");
    }

    return {
      eTag: null,
      size: file.metadata?.size || null,
      mimetype: file.metadata?.mimetype || null,
      cacheControl: null,
      lastModified: file.updated_at || null,
      contentLength: file.metadata?.size || null,
      httpStatusCode: null,
    };
  } catch (error) {
    logger.error("Metadata error", error);
    throw error;
  }
}

/**
 * Gets public URL for a file (for public buckets)
 */
export async function getPublicUrl(
  path: string,
  bucket: string = PUBLIC_ASSETS_BUCKET,
): Promise<string> {
  const supabase = await createClient();

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  return data.publicUrl;
}

/**
 * Storage configuration info for clients
 */
export async function getStorageInfo() {
  return {
    type: "supabase-storage" as const,
    supportsDirectUpload: true,
    maxFileSize: MAX_FILE_SIZE,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    buckets: {
      default: DEFAULT_BUCKET,
      chatAttachments: CHAT_ATTACHMENTS_BUCKET,
      publicAssets: PUBLIC_ASSETS_BUCKET,
    },
  };
}

/**
 * Checks if storage is properly configured
 */
export async function checkStorageConfiguration(): Promise<{
  isValid: boolean;
  error?: string;
  solution?: string;
}> {
  try {
    const supabase = await createClient();

    // Try to list buckets to verify connection
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      return {
        isValid: false,
        error: `Supabase Storage not accessible: ${error.message}`,
        solution:
          "Please check your Supabase configuration and ensure Storage is enabled.",
      };
    }

    // Check if required buckets exist
    const bucketNames = data?.map((b) => b.name) || [];
    const requiredBuckets = [DEFAULT_BUCKET, CHAT_ATTACHMENTS_BUCKET];

    const missingBuckets = requiredBuckets.filter(
      (name) => !bucketNames.includes(name),
    );

    if (missingBuckets.length > 0) {
      return {
        isValid: false,
        error: `Missing required storage buckets: ${missingBuckets.join(", ")}`,
        solution: `Please create the following buckets in your Supabase Storage:\n${missingBuckets.map((name) => `- ${name}`).join("\n")}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `Storage configuration check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      solution:
        "Please verify your Supabase configuration and network connectivity.",
    };
  }
}
