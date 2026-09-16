let version = 0;

export function invalidateImageCatalogCache() {
  version += 1;
}

export function imageCatalogCacheVersion() {
  return version;
}
