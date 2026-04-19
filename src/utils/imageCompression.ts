/**
 * Image Compression Utility
 * Compress and optimize images before upload
 * Uses Canvas API for client-side compression (no server dependency)
 */

import { logError, logWarning } from './errorTracking';

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  maxSizeKb?: number;
}

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  sizeBefore: number;
  sizeAfter: number;
  compressionRatio: number;
  format: string;
  quality: number;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION: CompressionOptions = {
  maxWidth: 2048,
  maxHeight: 2048,
  quality: 0.75,
  format: 'jpeg',
  maxSizeKb: 500, // Target size in KB
};

/**
 * Calculate target quality based on file size
 * Adaptively reduces quality until target size is reached
 */
function calculateTargetQuality(
  currentSize: number,
  targetSizeBytes: number,
  currentQuality: number,
  minQuality: number = 0.3
): number {
  if (currentSize <= targetSizeBytes) {
    return currentQuality;
  }

  const ratio = targetSizeBytes / currentSize;
  const qualityReduction = ratio * currentQuality;

  return Math.max(minQuality, qualityReduction);
}

/**
 * Get canvas context for drawing image
 */
function getCanvasContext(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas 2D context');
  }

  return { canvas, ctx };
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Scale down if larger than max
  if (width > maxWidth || height > maxHeight) {
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY);

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  return { width, height };
}

/**
 * Compress image using Canvas API
 */
export async function compressImage(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult> {
  const config = { ...DEFAULT_COMPRESSION, ...options };

  return new Promise((resolve, reject) => {
    // Validate file
    if (!file.type.startsWith('image/')) {
      reject(new Error('File must be an image'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const img = new Image();

        img.onload = () => {
          try {
            // Calculate new dimensions
            const { width, height } = calculateDimensions(
              img.width,
              img.height,
              config.maxWidth!,
              config.maxHeight!
            );

            // Create canvas and draw image
            const { canvas, ctx } = getCanvasContext(width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Compress with quality adjustment
            let quality = config.quality!;
            let attempt = 0;
            const maxAttempts = 5;
            const targetSizeBytes = (config.maxSizeKb || 500) * 1024;

            const compressAttempt = (): void => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    reject(new Error('Failed to create blob'));
                    return;
                  }

                  // Check if size is within target
                  if (blob.size <= targetSizeBytes || attempt >= maxAttempts) {
                    const result: CompressionResult = {
                      blob,
                      width,
                      height,
                      sizeBefore: file.size,
                      sizeAfter: blob.size,
                      compressionRatio: Number(((1 - blob.size / file.size) * 100).toFixed(1)),
                      format: config.format!,
                      quality: Number(quality.toFixed(2)),
                    };

                    logWarning(`Image compressed: ${file.size} → ${blob.size} bytes (${result.compressionRatio}%)`, {
                      action: 'image_compression',
                      additionalInfo: {
                        dimensions: `${width}x${height}`,
                        quality: Number(quality.toFixed(2)),
                        originalSize: file.size,
                        compressedSize: blob.size,
                        attempts: attempt,
                      },
                    });

                    resolve(result);
                  } else {
                    // Reduce quality and try again
                    quality = calculateTargetQuality(blob.size, targetSizeBytes, quality);
                    attempt++;
                    compressAttempt();
                  }
                },
                `image/${config.format}`,
                quality
              );
            };

            compressAttempt();
          } catch (err) {
            logError('Image compression failed', err, {
              action: 'compression_error',
              additionalInfo: {
                fileName: file.name,
                originalSize: file.size,
              },
            });
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = event.target?.result as string;
      } catch (err) {
        logError('Image processing failed', err, {
          action: 'image_processing_error',
          additionalInfo: { fileName: file.name },
        });
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress multiple images
 */
export async function compressImages(
  files: File[],
  options?: Partial<CompressionOptions>
): Promise<CompressionResult[]> {
  const results = await Promise.all(files.map((file) => compressImage(file, options)));
  return results;
}

/**
 * Get file info including compression recommendation
 */
export function getCompressionRecommendation(file: File): {
  shouldCompress: boolean;
  reason: string;
  estimatedSavings: string;
} {
  const sizeInKb = file.size / 1024;

  // Recommend compression if > 1MB
  if (sizeInKb > 1024) {
    const estimated = Math.round(sizeInKb * 0.5); // Estimate 50% reduction
    return {
      shouldCompress: true,
      reason: `Fayl ${sizeInKb.toFixed(0)}KB. Yerə qənaət etmək üçün sıxılması tövsiyə olunur.`,
      estimatedSavings: `~${estimated}KB ə qənaət`,
    };
  }

  if (sizeInKb > 500) {
    return {
      shouldCompress: true,
      reason: `Fayl ${sizeInKb.toFixed(0)}KB. Yükləmə sürətini artırmaq üçün sıxılması tövsiyə olunur.`,
      estimatedSavings: '~25% ə qənaət',
    };
  }

  return {
    shouldCompress: false,
    reason: 'Fayl optimal ölçüdədir.',
    estimatedSavings: 'Heç bir qənaət',
  };
}

/**
 * Hook for component-level image compression with progress
 */
export function useImageCompression() {
  const compress = async (
    file: File,
    options?: Partial<CompressionOptions>,
    onProgress?: (progress: number) => void
  ): Promise<CompressionResult> => {
    onProgress?.(10);
    const result = await compressImage(file, options);
    onProgress?.(100);
    return result;
  };

  return { compress, getRecommendation: getCompressionRecommendation };
}
