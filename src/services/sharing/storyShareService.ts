/**
 * Story Share Service
 * Handles composite image creation and mobile sharing
 */

import { getSignedPhotoUrl } from '../../hooks/useSignedPhotoUrl';

interface CompositeOptions {
  templateUrl: string;
  photoUrl: string;
  previewMaxWidth?: number;
}

export interface ShareResult {
  success: boolean;
  message: string;
  blobUrl?: string;
  mode?: 'web-share' | 'download';
}

const IMAGE_LOAD_TIMEOUT_MS = 12000;
const STORY_EXPORT_TIMEOUT_MS = 8000;
const STORY_TEMPLATE_REPLACEMENTS: Record<string, string> = {
  '/story-templates/elegant.png': '/story-templates/template-1.jpg',
  '/story-templates/elegant.svg': '/story-templates/template-1.jpg',
  '/story-templates/modern.png': '/story-templates/template-2.jpg',
  '/story-templates/modern.svg': '/story-templates/template-2.jpg',
  '/story-templates/vintage.png': '/story-templates/template-3.jpg',
  '/story-templates/vintage.svg': '/story-templates/template-3.jpg',
  '/story-templates/neon.png': '/story-templates/template-4.jpg',
  '/story-templates/neon.svg': '/story-templates/template-4.jpg',
  '/story-templates/botanical.png': '/story-templates/template-5.jpg',
  '/story-templates/botanical.svg': '/story-templates/template-5.jpg',
  '/story-templates/marble.png': '/story-templates/template-6.jpg',
  '/story-templates/marble.svg': '/story-templates/template-6.jpg',
};

const normalizeStoryTemplateUrl = (templateUrl: string | null) =>
  templateUrl ? STORY_TEMPLATE_REPLACEMENTS[templateUrl] ?? templateUrl : null;

/**
 * Load image as HTMLImageElement with crossOrigin support
 */
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görsel yüklenemedi.'));
    img.src = src;
  });

/**
 * Load image with timeout
 */
const loadWithTimeout = (src: string, timeoutMs = IMAGE_LOAD_TIMEOUT_MS): Promise<HTMLImageElement> => {
  return Promise.race([
    loadImage(src),
    new Promise<HTMLImageElement>((_, reject) =>
      setTimeout(() => reject(new Error(`Image load timeout: ${src}`)), timeoutMs)
    ),
  ]);
};

const fetchImageAsObjectUrl = async (src: string): Promise<{ url: string; revoke: () => void }> => {
  const response = await fetch(src, { mode: 'cors', credentials: 'omit' });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  return {
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
};

const loadPhotoForCanvas = async (photoUrl: string): Promise<{ image: HTMLImageElement; revoke: () => void }> => {
  try {
    const objectUrl = await fetchImageAsObjectUrl(photoUrl);
    return {
      image: await loadWithTimeout(objectUrl.url),
      revoke: objectUrl.revoke,
    };
  } catch (directError) {
    console.warn('[Story] Direct photo load failed, trying image proxy:', directError);
    const proxiedPhotoUrl = `https://wsrv.nl/?url=${encodeURIComponent(photoUrl)}`;
    const image = await loadWithTimeout(proxiedPhotoUrl);

    return {
      image,
      revoke: () => undefined,
    };
  }
};

const isGreenScreenPixel = (r: number, g: number, b: number) =>
  g > 170 && r < 70 && b < 95 && g - Math.max(r, b) > 95;

/**
 * Composite user photo onto green-screen template
 * Returns blob of PNG image
 */
export const compositeTemplateWithPhoto = async (options: CompositeOptions): Promise<Blob | null> => {
  let revokePhotoObjectUrl: (() => void) | null = null;

  try {
    const { templateUrl, photoUrl, previewMaxWidth } = options;

    const [templateImg, photoResult] = await Promise.all([
      loadWithTimeout(templateUrl),
      loadPhotoForCanvas(photoUrl),
    ]);
    const photoImg = photoResult.image;
    revokePhotoObjectUrl = photoResult.revoke;

    const canvas = document.createElement('canvas');
    const sourceWidth = Math.round(templateImg.naturalWidth || templateImg.width);
    const sourceHeight = Math.round(templateImg.naturalHeight || templateImg.height);
    const previewScale =
      previewMaxWidth && sourceWidth > previewMaxWidth ? previewMaxWidth / sourceWidth : 1;
    const templateWidth = Math.round(sourceWidth * previewScale);
    const templateHeight = Math.round(sourceHeight * previewScale);

    if (templateWidth <= 0 || templateHeight <= 0) {
      console.warn('[Composite] Invalid template dimensions:', templateWidth, templateHeight);
      return null;
    }

    canvas.width = templateWidth;
    canvas.height = templateHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.warn('[Composite] Failed to get 2D context');
      return null;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(templateImg, 0, 0, templateWidth, templateHeight);
    const templateImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const templateData = templateImageData.data;
    let minX = canvas.width,
      minY = canvas.height,
      maxX = 0,
      maxY = 0,
      greenPixelCount = 0;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = templateData[i],
          g = templateData[i + 1],
          b = templateData[i + 2];

        if (isGreenScreenPixel(r, g, b)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          greenPixelCount++;
        }
      }
    }

    if (greenPixelCount < 100 || maxX <= minX || maxY <= minY) {
      console.warn('[Composite] No green screen detected');
      return null;
    }

    const greenW = maxX - minX + 1;
    const greenH = maxY - minY + 1;

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = templateWidth;
    finalCanvas.height = templateHeight;
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) {
      console.warn('[Composite] Failed to get final context');
      return null;
    }
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';

    // Draw photo into green area with cover fit
    const photoAspect = photoImg.width / photoImg.height;
    const slotAspect = greenW / greenH;
    let sx = 0,
      sy = 0,
      sw = photoImg.width,
      sh = photoImg.height;

    if (photoAspect > slotAspect) {
      sw = photoImg.height * slotAspect;
      sx = (photoImg.width - sw) / 2;
    } else {
      sh = photoImg.width / slotAspect;
      sy = (photoImg.height - sh) / 2;
    }

    finalCtx.drawImage(photoImg, sx, sy, sw, sh, minX, minY, greenW, greenH);

    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = templateWidth;
    overlayCanvas.height = templateHeight;
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!overlayCtx) {
      console.warn('[Composite] Failed to get overlay context');
      return null;
    }

    for (let i = 0; i < templateData.length; i += 4) {
      if (isGreenScreenPixel(templateData[i], templateData[i + 1], templateData[i + 2])) {
        templateData[i + 3] = 0;
      }
    }

    overlayCtx.putImageData(templateImageData, 0, 0);
    finalCtx.drawImage(overlayCanvas, 0, 0);

    return new Promise<Blob | null>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[Composite] toBlob timeout');
        resolve(null);
      }, STORY_EXPORT_TIMEOUT_MS);

      finalCanvas.toBlob(
        (blob) => {
          clearTimeout(timeout);
          if (!blob) {
            console.warn('[Composite] toBlob returned null');
            resolve(null);
            return;
          }
          resolve(blob);
        },
        'image/png',
        0.95
      );
    });
  } catch (err) {
    console.error('[Composite] Error:', err);
    return null;
  } finally {
    revokePhotoObjectUrl?.();
  }
};

/**
 * Share blob on mobile
 * Tries Web Share API first, then falls back to download
 */
export const shareStoryImageBlob = async (blob: Blob, fileName: string): Promise<ShareResult> => {
  try {
    let blobUrl: string | null = null;

    try {
      blobUrl = URL.createObjectURL(blob);
      const file = new File([blob], fileName, { type: 'image/png' });
      const sharePayload: ShareData = {
        files: [file],
        title: 'ShareVibe Story',
        text: 'ShareVibe ile paylaş',
      };

      const hasWebShareAPI = typeof navigator.share === 'function';
      const canShareFile =
        hasWebShareAPI &&
        (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

      if (canShareFile) {
        try {
          await navigator.share(sharePayload);
          return { success: true, message: 'Görsel hazır. Instagram Story’yi seçin.', blobUrl, mode: 'web-share' };
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return { success: false, message: 'Paylaşım iptal edildi.' };
          }
          console.warn('[Share] Web Share failed:', err.name, err.message);
        }
      }

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return {
        success: true,
        message: 'Story görseli indirildi. Instagram uygulamasında Story olarak yükleyebilirsiniz.',
        blobUrl,
        mode: 'download',
      };
    } finally {
      if (blobUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch (e) {
            console.warn('[Share] Could not revoke blob URL:', e);
          }
        }, 3000);
      }
    }
  } catch (err: any) {
    console.error('[Share] Unhandled error:', err.message || err);
    return { 
      success: false, 
      message: 'Paylaşım başarısız: ' + (err.message || 'Bilinmeyen hata') 
    };
  }
};

/**
 * Complete story share flow
 */
export const shareToInstagramStory = async (options: {
  mediaId: string;
  photoUrl: string;
  activeStoryTemplateUrl: string | null;
  onShare?: (success: boolean) => Promise<void>;
}): Promise<ShareResult> => {
  const { mediaId, photoUrl, activeStoryTemplateUrl, onShare } = options;

  try {
    let blob: Blob | null = null;
    let resolvedPhotoUrl = photoUrl;

    try {
      resolvedPhotoUrl = await getSignedPhotoUrl(mediaId);
    } catch (error) {
      console.warn('[Story] Signed photo URL could not be fetched; using the stored URL.', error);
    }

    // Try template composite first
    const normalizedTemplateUrl = normalizeStoryTemplateUrl(activeStoryTemplateUrl);

    if (normalizedTemplateUrl) {
      const templateUrl = normalizedTemplateUrl.startsWith('http')
        ? normalizedTemplateUrl
        : `${window.location.origin}${normalizedTemplateUrl}`;

      blob = await compositeTemplateWithPhoto({ templateUrl, photoUrl: resolvedPhotoUrl });
      if (blob) {
        console.log('[Story] Using composite template image');
      } else {
        console.warn('[Story] Composite failed, will try plain photo');
      }
    }

    // Fall back to plain photo
    if (!blob) {
      try {
        let response = await fetch(resolvedPhotoUrl, { mode: 'cors', credentials: 'omit' });
        if (!response.ok) {
          const proxiedUrl = `https://wsrv.nl/?url=${encodeURIComponent(resolvedPhotoUrl)}`;
          response = await fetch(proxiedUrl, { mode: 'cors', credentials: 'omit' });
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        blob = await response.blob();
      } catch (err) {
        console.error('[Story] Failed to fetch photo:', err);
        throw new Error('Görüntü yüklenemedi');
      }
    }

    // Share the blob
    const fileName = blob.type === 'image/png' ? 'sharevibe-story.png' : 'sharevibe-story.jpg';
    const result = await shareStoryImageBlob(blob, fileName);

    if (result.success && onShare) {
      await onShare(true);
    } else if (!result.success) {
      console.warn('[Story] Share result:', result.message);
      throw new Error(result.message);
    }

    return result;
  } catch (err: any) {
    console.error('[Story] Complete error:', err);
    throw err;
  }
};
