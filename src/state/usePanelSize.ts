import { useEffect, useState } from "react";

/**
 * Ширина окна панели. Панели можно растягивать, поэтому интерфейс
 * подстраивается: в узком окне подписи скрываются и остаются только значки.
 */
export function usePanelSize() {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    function onResize() {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return {
    width,
    height,
    isCompact: width < 620,   // прячем подписи у вкладок/кнопок
    isNarrow: width < 860     // одна колонка вместо двух
  };
}
