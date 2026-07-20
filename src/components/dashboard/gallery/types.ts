export interface GalleryPhoto {
  id: string;
  title: string | null;
  description: string | null;
  tags: string | null;
  camera: string | null;
  lens: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  profilePinPosition: number | null;
  createdAt: string;
}

export interface GalleryPhotoUpdates {
  title: string;
  description: string | null;
  tags: string | null;
  camera: string | null;
  lens: string | null;
}
