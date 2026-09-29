// Transforms raw image URLs into optimized Cloudinary URLs with auto-format and quality compression
export function getCloudinaryImageUrl(publicIdOrUrl: string, options?: { width?: number; height?: number; crop?: string }) {
  if (!publicIdOrUrl) return '';

  // 1. Build transformation string (width, height, crop, auto-format f_auto, auto-quality q_auto)
  const width = options?.width ? `w_${options.width}` : 'w_1000';
  const height = options?.height ? `h_${options.height}` : '';
  const crop = options?.crop ? `c_${options.crop}` : '';
  const transforms = [width, height, crop, 'f_auto', 'q_auto', 'c_limit'].filter(Boolean).join(',');

  // 2. If already a full HTTP/HTTPS URL
  if (publicIdOrUrl.startsWith('http://') || publicIdOrUrl.startsWith('https://')) {
    // Inject Cloudinary optimizations if hosting on Cloudinary
    if (publicIdOrUrl.includes('res.cloudinary.com') && publicIdOrUrl.includes('/image/upload/')) {
      if (!publicIdOrUrl.includes('/f_auto') && !publicIdOrUrl.includes('/q_auto')) {
        return publicIdOrUrl.replace('/image/upload/', `/image/upload/${transforms}/`);
      }
    }
    return publicIdOrUrl;
  }

  // 3. Fallback: Construct full Cloudinary URL from publicId if provided
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
  if (!cloudName) return publicIdOrUrl;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicIdOrUrl}`;
}

