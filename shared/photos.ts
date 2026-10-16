// Profile photos are squares this many pixels wide, cut and shrunk in the browser before upload.
export const PHOTO_SIZE = 320;

// Largest upload the server accepts. A 320 px JPEG is usually 15 to 40 KB.
export const PHOTO_MAX_BYTES = 200 * 1024;

// Address of a profile photo. The date in it changes with each new photo, so browsers can keep
// a copy for long and still show the new one at once.
export function photoUrl(userId: string, updatedAt: Date | string | null | undefined): string | null {
  if (!updatedAt) return null;
  const version = new Date(updatedAt).getTime();
  return `/api/users/${userId}/photo?v=${version}`;
}
