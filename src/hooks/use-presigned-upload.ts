"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { getStorageInfoAction } from "@/app/api/storage/actions";

// Types
interface StorageInfo {
  type: "supabase-storage";
  supportsDirectUpload: boolean;
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  buckets?: {
    default: string;
    chatAttachments: string;
    publicAssets: string;
  };
}

interface UploadOptions {
  filename?: string;
  contentType?: string;
  path?: string;
  bucket?: string;
}

interface UploadResult {
  pathname: string;
  url: string;
  contentType?: string;
  size?: number;
  id?: string;
}

// Helpers
function useStorageInfo() {
  const { data, isLoading } = useSWR<StorageInfo>(
    "storage-info",
    getStorageInfoAction,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  return {
    storageType: data?.type,
    supportsDirectUpload: data?.supportsDirectUpload ?? false,
    isLoading,
  };
}

/**
 * Hook for uploading files to storage.
 *
 * Automatically uses the optimal upload method based on storage backend:
 * - Vercel Blob: Direct upload from browser (fast)
 * - S3: Presigned URL (future)
 * - Local FS: Server upload (fallback)
 *
 * @example
 * ```tsx
 * function FileUpload() {
 *   const { upload, isUploading } = useFileUpload();
 *
 *   const handleFile = async (file: File) => {
 *     const result = await upload(file);
 *     console.log('Public URL:', result.url);
 *   };
 *
 *   return <input type="file" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />;
 * }
 * ```
 */
export function useFileUpload() {
  const {
    storageType,
    supportsDirectUpload,
    isLoading: isLoadingStorageInfo,
  } = useStorageInfo();
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File,
      uploadOptions: UploadOptions = {},
    ): Promise<UploadResult | undefined> => {
      if (!(file instanceof File)) {
        toast.error("Upload expects a File instance");
        return;
      }

      // Note: filename from uploadOptions or file.name - currently unused but available if needed
      // const filename = uploadOptions.filename ?? file.name;
      const contentType =
        uploadOptions.contentType || file.type || "application/octet-stream";

      // Wait for storage info to load
      if (isLoadingStorageInfo || !storageType) {
        toast.error("Storage is still loading. Please try again.");
        return;
      }

      setIsUploading(true);
      try {
        // Supabase Storage direct upload
        if (supportsDirectUpload && storageType === "supabase-storage") {
          // Request signed upload URL
          const uploadUrlResponse = await fetch("/api/storage/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: uploadOptions.path || "",
              bucket: uploadOptions.bucket,
            }),
          });

          if (!uploadUrlResponse.ok) {
            const errorBody = await uploadUrlResponse.json().catch(() => ({}));

            // Display detailed error with solution if available
            if (errorBody.solution) {
              toast.error(errorBody.error || "Failed to get upload URL", {
                description: errorBody.solution,
                duration: 10000, // Show for 10 seconds
              });
            } else {
              toast.error(errorBody.error || "Failed to get upload URL");
            }
            return;
          }

          const uploadUrlData = await uploadUrlResponse.json();

          if (!uploadUrlData.directUploadSupported) {
            // Fallback to server upload
            const formData = new FormData();
            formData.append("file", file);
            formData.append("path", uploadOptions.path || "");

            const serverUploadResponse = await fetch("/api/storage/upload", {
              method: "POST",
              body: formData,
            });

            if (!serverUploadResponse.ok) {
              const errorBody = await serverUploadResponse
                .json()
                .catch(() => ({}));

              if (errorBody.solution) {
                toast.error(errorBody.error || "Server upload failed", {
                  description: errorBody.solution,
                  duration: 10000,
                });
              } else {
                toast.error(errorBody.error || "Server upload failed");
              }
              return;
            }

            const result = await serverUploadResponse.json();

            return {
              pathname: result.path,
              url: result.url,
              contentType: file.type,
              size: file.size,
              id: result.id,
            };
          }

          // Upload to signed URL
          const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": contentType },
            body: file,
          });

          if (!uploadResponse.ok) {
            toast.error(`Upload failed: ${uploadResponse.status}`);
            return;
          }

          return {
            pathname: uploadUrlData.path,
            url: uploadUrlData.uploadUrl, // Return the signed URL as the URL
            contentType,
            size: file.size,
          };
        }

        // Fallback: Server upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", uploadOptions.path || "");

        const serverUploadResponse = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        });

        if (!serverUploadResponse.ok) {
          const errorBody = await serverUploadResponse.json().catch(() => ({}));

          // Display detailed error with solution if available
          if (errorBody.solution) {
            toast.error(errorBody.error || "Server upload failed", {
              description: errorBody.solution,
              duration: 10000, // Show for 10 seconds
            });
          } else {
            toast.error(errorBody.error || "Server upload failed");
          }
          return;
        }

        const result = await serverUploadResponse.json();

        return {
          pathname: result.path,
          url: result.url,
          contentType: file.type,
          size: file.size,
          id: result.id,
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Upload failed";
        toast.error(message);
        return;
      } finally {
        setIsUploading(false);
      }
    },
    [storageType, supportsDirectUpload, isLoadingStorageInfo],
  );

  return {
    upload,
    isUploading: isUploading || isLoadingStorageInfo,
  };
}

// Alias for backward compatibility
export const usePresignedUpload = useFileUpload;
