/** Длина ролика в браузере по метаданным файла. */
export function readVideoFileDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      if (error) reject(new Error(error));
    };
    const accept = () => {
      const seconds = video.duration;
      if (Number.isFinite(seconds) && seconds > 0 && seconds !== Infinity) {
        finish();
        resolve(seconds);
        return;
      }
      finish("duration");
    };
    const timer = window.setTimeout(() => finish("duration"), 8_000);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = accept;
    video.onerror = () => finish("type");
    video.src = url;
  });
}
