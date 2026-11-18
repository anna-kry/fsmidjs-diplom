import { useEffect, useRef, useState } from 'react';

/** Ключ API 2GIS (демо-ключ). */
const API_KEY = 'c2ce063b-1a5c-44d3-8bd2-4ba14bff9d3b';

/** Координаты Москвы (центр карты). */
const MOSCOW_CENTER: [number, number] = [37.6173, 55.7517];

/** Ожидание загрузки скрипта 2GIS: 100 попыток по 100 мс (~10 секунд). */
const POLL_INTERVAL_MS = 100;
const MAX_ATTEMPTS = 100;

/** Минимальный интерфейс экземпляра карты, который нам нужен. */
type MapInstance = { destroy: () => void };

/** Тип для глобального объекта 2GIS MapGL. */
interface WindowWithMapGL extends Window {
  mapgl?: {
    Map: new (
      container: HTMLElement,
      options: { center: [number, number]; zoom: number; key: string },
    ) => MapInstance;
  };
}

/**
 * Карта библиотек Москвы на базе 2GIS MapGL.
 * Скрипт подключён в index.html с атрибутом defer, поэтому эффект опрашивает
 * window.mapgl, пока библиотека не загрузится, затем инициализирует карту.
 * При размонтировании карта уничтожается, таймер очищается.
 */
const Map = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let map: MapInstance | undefined;
    let cancelled = false;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) {
        return;
      }

      const mapgl = (window as WindowWithMapGL).mapgl;
      if (mapgl && mapRef.current) {
        try {
          map = new mapgl.Map(mapRef.current, {
            center: MOSCOW_CENTER,
            zoom: 10,
            key: API_KEY,
          });
        } catch {
          setMapError(true);
        }
        return;
      }

      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        setMapError(true);
        return;
      }
      timer = setTimeout(tryInit, POLL_INTERVAL_MS);
    };

    tryInit();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
      map?.destroy();
    };
  }, []);

  if (mapError) {
    return (
      <section className="map">
        <h2 className="map__title">Библиотеки Москвы</h2>
        <div className="map__placeholder">
          Карта временно недоступна. Попробуйте обновить страницу.
        </div>
      </section>
    );
  }

  return (
    <section className="map">
      <h2 className="map__title">Библиотеки Москвы</h2>
      <div className="map__container" ref={mapRef} />
    </section>
  );
};

export default Map;
