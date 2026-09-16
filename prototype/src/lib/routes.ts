/** Студия «создать самому» для фото и видео (авторизованные пользователи). */
export const CREATE_FOTO_VIDEO_PATH = "/create-foto-video";

const LEGACY_IMAGE_STUDIO_PATH = "/images";

function pathEqualsOrNested(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function isImageStudioPath(pathname: string): boolean {
  return pathEqualsOrNested(pathname, CREATE_FOTO_VIDEO_PATH) || pathEqualsOrNested(pathname, LEGACY_IMAGE_STUDIO_PATH);
}

export function imageStudioHref(query = ""): string {
  const base = CREATE_FOTO_VIDEO_PATH;
  return query ? `${base}?${query.replace(/^\?/, "")}` : base;
}

export function imageStudioAgentHref(agentId: string): string {
  return imageStudioHref(`agent=${encodeURIComponent(agentId)}`);
}

export function videoStudioAgentHref(agentId: string): string {
  return imageStudioHref(`tab=video&videoAgent=${encodeURIComponent(agentId)}`);
}
