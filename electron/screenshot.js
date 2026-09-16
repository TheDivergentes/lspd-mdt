// Захват экрана целиком (без видео-потока — статичный кадр в момент
// нажатия хоткея), чтобы renderer дальше дал пользователю выделить
// прямоугольную область и разметить её. Работает через desktopCapturer —
// стандартный способ Electron получить содержимое экрана из main-процесса
// без getUserMedia/live-video, что для одного статичного кадра избыточно.

const { desktopCapturer, screen } = require("electron");

async function captureFullScreen() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const scaleFactor = primaryDisplay.scaleFactor || 1;
  const { width, height } = primaryDisplay.size;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: {
      width: Math.round(width * scaleFactor),
      height: Math.round(height * scaleFactor)
    }
  });

  // На системе с одним монитором источник почти всегда единственный —
  // на нескольких мониторах берём тот, что помечен как основной по имени
  // (Electron обычно ставит "Screen 1" первым для primary display).
  const source = sources[0];
  if (!source) throw new Error("Не удалось получить список экранов для захвата.");

  return {
    dataUrl: source.thumbnail.toDataURL(),
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    scaleFactor
  };
}

module.exports = { captureFullScreen };
