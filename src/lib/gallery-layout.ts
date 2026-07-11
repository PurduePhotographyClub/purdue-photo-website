interface GalleryLayoutClassNames {
  container: string;
  item: string;
}

const GALLERY_ITEM_CLASS_NAME = "block w-full break-inside-avoid";

export function getGalleryLayoutClassNames(imageCount: number): GalleryLayoutClassNames {
  if (imageCount === 1) {
    return {
      container: "mx-auto max-w-xl grid grid-cols-1 items-start gap-2",
      item: GALLERY_ITEM_CLASS_NAME,
    };
  }

  if (imageCount === 2) {
    return {
      container: "mx-auto max-w-5xl grid grid-cols-1 items-start gap-2 sm:grid-cols-2",
      item: GALLERY_ITEM_CLASS_NAME,
    };
  }

  return {
    container: "columns-1 gap-2 sm:columns-2 lg:columns-3",
    item: `${GALLERY_ITEM_CLASS_NAME} mb-2`,
  };
}
