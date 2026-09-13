/**
 * Client-side image compression utility for compliance inspection uploads.
 *
 * Scales images down to a maximum dimension of 1920px while preserving aspect ratio,
 * re-encodes to high-quality JPEG (quality 0.82), and leaves smaller images untouched.
 * Safely falls back to the original file if any stage of compression fails.
 */

export interface ImageCompressionOptions {
  /** Maximum width or height in pixels. Default: 1920 */
  maxDimension?: number;
  /** JPEG export quality (0.0 to 1.0). Default: 0.82 */
  quality?: number;
}

const SUPPORTED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Resizes and compresses an image File in the browser using HTML5 Canvas.
 * Always resolves -- if compression encounters any error, returns the original File safely.
 */
export async function compressImageForUpload(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? 1920;
  const quality = options.quality ?? 0.82;

  // Non-image or unsupported formats pass through untouched
  if (!SUPPORTED_INPUT_TYPES.has(file.type)) {
    return file;
  }

  // If in a non-DOM environment (e.g. unit tests or SSR), return original file
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

  return new Promise<File>((resolve) => {
    let objectUrl = '';

    const safeFallback = () => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // Ignore cleanup errors
        }
      }
      resolve(file);
    };

    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      return safeFallback();
    }

    const img = new Image();

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';

        const origW = img.naturalWidth || img.width;
        const origH = img.naturalHeight || img.height;

        if (!origW || !origH) {
          return safeFallback();
        }

        const longestSide = Math.max(origW, origH);

        // If the image is already within bounds and under 1.5MB JPEG, skip re-compression
        if (longestSide <= maxDimension && file.size <= 1.5 * 1024 * 1024 && file.type === 'image/jpeg') {
          return resolve(file);
        }

        // Calculate target dimensions preserving aspect ratio (do not upscale)
        let targetW = origW;
        let targetH = origH;

        if (longestSide > maxDimension) {
          const scale = maxDimension / longestSide;
          targetW = Math.max(1, Math.round(origW * scale));
          targetH = Math.max(1, Math.round(origH * scale));
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return safeFallback();
        }

        // Enable high-quality bilinear/bicubic resampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw white background in case source PNG had transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetW, targetH);

        ctx.drawImage(img, 0, 0, targetW, targetH);

        const outputMime = 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return safeFallback();
            }

            // If compressed blob is unexpectedly larger than original file and dimensions weren't shrunk, keep original
            if (blob.size >= file.size && longestSide <= maxDimension) {
              return resolve(file);
            }

            // Standardize extension to .jpg while preserving base filename
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const newFileName = `${baseName}.jpg`;

            const compressedFile = new File([blob], newFileName, {
              type: outputMime,
              lastModified: Date.now(),
            });

            // Lightweight performance log (no sensitive data or image contents)
            const origKb = (file.size / 1024).toFixed(0);
            const compKb = (compressedFile.size / 1024).toFixed(0);
            console.log(
              `[ImageCompressor] "${file.name}": ${origKb}KB (${origW}x${origH}) -> ${compKb}KB (${targetW}x${targetH})`
            );

            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      } catch (err) {
        console.warn('[ImageCompressor] Compression processing error, falling back to original file:', err);
        safeFallback();
      }
    };

    img.onerror = () => {
      safeFallback();
    };

    img.src = objectUrl;
  });
}
