import { PHOTO_SIZE } from '../shared/photos';

// Cuts the middle square out of a picture and shrinks it to PHOTO_SIZE pixels, as a JPEG.
// A phone photo of several megabytes becomes about 20 KB, quick to send on a mobile connection.
export async function squarePhoto(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez une image');
  const image = await loadImage(file);
  try {
    const width = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const height = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!width || !height) throw new Error('Image illisible');
    const side = Math.min(width, height);
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_SIZE;
    canvas.height = PHOTO_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image illisible');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, (width - side) / 2, (height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Image illisible');
    return blob;
  } finally {
    if ('close' in image) image.close();
  }
}

// createImageBitmap turns phone photos the right way up; older browsers fall back to <img>.
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error('Image illisible : essayez une autre photo');
  } finally {
    URL.revokeObjectURL(url);
  }
}
