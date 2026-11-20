import { useEffect, useRef, useState } from 'react';
import librariesList from './libraries-list.json';

/** Ключ API 2GIS (демо-ключ). */
const API_KEY = 'c2ce063b-1a5c-44d3-8bd2-4ba14bff9d3b';

/** Координаты Москвы (центр карты). */
const MOSCOW_CENTER: [number, number] = [37.6173, 55.7517];

/** Ожидание загрузки скрипта 2GIS: 100 попыток по 100 мс (~10 секунд). */
const POLL_INTERVAL_MS = 100;
const MAX_ATTEMPTS = 100;

/** Дни недели в том виде, в каком они записаны в WorkingHours. */
const DAY_NAMES = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
];

/** Минимальный интерфейс экземпляра карты, который нам нужен. */
type MapInstance = { destroy: () => void };

/** Минимальный интерфейс обычного маркера 2GIS. */
type MarkerInstance = {
  destroy: () => void;
  on: (event: string, handler: () => void) => void;
};

/** Минимальный интерфейс HTML-маркера 2GIS (плашка с произвольным HTML). */
type HtmlMarkerInstance = { destroy: () => void };

/** Опции обычного маркера. */
interface MarkerGlOptions {
  coordinates: [number, number];
}

/** Опции HTML-маркера (по документации 2GIS MapGL). */
interface HtmlMarkerGlOptions {
  coordinates: number[];
  html: HTMLElement | string;
  zIndex?: number;
  preventMapInteractions?: boolean;
  interactive?: boolean;
}

/** Тип для глобального объекта 2GIS MapGL. */
interface WindowWithMapGL extends Window {
  mapgl?: {
    Map: new (
      container: HTMLElement,
      options: { center: [number, number]; zoom: number; key: string },
    ) => MapInstance;
    Marker: new (map: MapInstance, options: MarkerGlOptions) => MarkerInstance;
    HtmlMarker: new (
      map: MapInstance,
      options: HtmlMarkerGlOptions,
    ) => HtmlMarkerInstance;
  };
}

/** Запись расписания: день недели и часы работы. */
interface WorkingHour {
  DayWeek?: string;
  WorkHours?: string;
}

/** Одна библиотека из libraries-list.json. */
interface LibraryFromJson {
  CommonName: string;
  geodata_center?: { coordinates?: [number, number] };
  WorkingHours?: WorkingHour[];
  PublicPhone?: { PublicPhone?: string }[];
}

/** Точка на карте: координаты [долгота, широта] и данные для плашки. */
interface LibraryPoint {
  name: string;
  coordinates: [number, number];
  /** Часы работы сегодня ('12:00-22:00', 'выходной') или null, если данных нет. */
  todayHours: string | null;
  /** Первый телефон из PublicPhone. */
  phone: string | null;
}

const libraries = librariesList as unknown as LibraryFromJson[];

/** Путь к точке из geoData: берём координаты центра библиотеки. */
const getCoordinates = (library: LibraryFromJson): [number, number] | null => {
  const coords = library.geodata_center?.coordinates;
  if (!coords || coords.length < 2) return null;
  return [coords[0], coords[1]];
};

/** Часы работы библиотеки на сегодняшний день недели. */
const getTodayHours = (schedule?: WorkingHour[]): string | null => {
  const today = DAY_NAMES[new Date().getDay()];
  const entry = schedule?.find((item) => item.DayWeek === today);
  return entry?.WorkHours ?? null;
};

/** Открыта ли библиотека сегодня (есть часы и это не «выходной»). */
const isOpenToday = (point: LibraryPoint): boolean => {
  if (!point.todayHours) return false;
  return !point.todayHours.toLowerCase().includes('выходной');
};

/** Точки для маркеров: только те библиотеки, у которых есть координаты. */
const points: LibraryPoint[] = libraries
  .map((library) => {
    const coordinates = getCoordinates(library);
    if (!coordinates) return null;
    return {
      name: library.CommonName,
      coordinates,
      todayHours: getTodayHours(library.WorkingHours),
      phone: library.PublicPhone?.[0]?.PublicPhone ?? null,
    };
  })
  .filter((point): point is LibraryPoint => point !== null);

/**
 * Собирает плашку с информацией о библиотеке: название, работает ли сегодня
 * и время работы, первый телефон. Создаётся через DOM-методы, чтобы не
 * подставлять данные JSON в HTML-строку.
 */
const createPlate = (point: LibraryPoint): HTMLElement => {
  const open = isOpenToday(point);

  const plate = document.createElement('div');
  plate.className = 'map__plate';

  const title = document.createElement('div');
  title.className = 'map__plate-title';
  title.textContent = point.name;

  const status = document.createElement('div');
  status.className = `map__plate-status ${open ? 'map__plate-status--open' : 'map__plate-status--closed'}`;
  status.textContent = point.todayHours
    ? `${open ? 'Открыто' : 'Закрыто'} сегодня: ${point.todayHours}`
    : 'Сегодня: нет данных о режиме работы';

  plate.append(title, status);

  if (point.phone) {
    const phone = document.createElement('div');
    phone.className = 'map__plate-phone';
    phone.textContent = `Телефон: ${point.phone}`;
    plate.append(phone);
  }

  return plate;
};

/**
 * Карта библиотек Москвы на базе 2GIS MapGL.
 * Скрипт подключён в index.html с атрибутом defer, поэтому эффект опрашивает
 * window.mapgl, пока библиотека не загрузится, затем инициализирует карту
 * и расставляет маркеры библиотек из libraries-list.json.
 * Названия скрыты: по клику на геоточку показывается белая плашка с
 * названием, режимом работы сегодня и телефоном. Повторный клик или клик
 * по другому маркеру — плашку скрывает/переключает.
 * При размонтировании карта, маркеры и плашка уничтожаются, таймер очищается.
 */
const Map = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let map: MapInstance | undefined;
    let destroyMarkers: (() => void) | undefined;
    let destroyPlate: (() => void) | undefined;
    let cancelled = false;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) {
        return;
      }

      const mapgl = (window as WindowWithMapGL).mapgl;
      if (mapgl && mapRef.current) {
        try {
          const createdMap = new mapgl.Map(mapRef.current, {
            center: MOSCOW_CENTER,
            // При открытии показываем центр Москвы, а не весь город:
            // 10 — весь город, 12 — центр в пределах нескольких кварталов.
            zoom: 13,
            key: API_KEY,
          });
          map = createdMap;

          const MarkerCtor = mapgl.Marker;
          const HtmlMarkerCtor = mapgl.HtmlMarker;

          /** Все пины на карте (без подписей). */
          const pins: MarkerInstance[] = [];
          /** Открытая плашка и точка, к которой она привязана. */
          let plate: HtmlMarkerInstance | null = null;
          let platedPoint: LibraryPoint | null = null;

          /** Закрывает текущую плашку, если она открыта. */
          const hidePlate = () => {
            plate?.destroy();
            plate = null;
            platedPoint = null;
          };

          /** Показывает плашку для точки (предыдущую закрывает). */
          const showPlate = (point: LibraryPoint) => {
            hidePlate();
            plate = new HtmlMarkerCtor(createdMap, {
              coordinates: point.coordinates,
              html: createPlate(point),
              zIndex: 1000,
              // Плашка не «прокидывает» клики на карту под собой.
              preventMapInteractions: true,
              interactive: true,
            });
            platedPoint = point;
          };

          /** Клик по геоточке: плашку показывает или скрывает. */
          const handlePinClick = (point: LibraryPoint) => {
            if (platedPoint === point) {
              hidePlate();
            } else {
              showPlate(point);
            }
          };

          // По умолчанию все точки — только пины, без названий.
          points.forEach((point) => {
            const pin = new MarkerCtor(createdMap, {
              coordinates: point.coordinates,
            });
            pin.on('click', () => handlePinClick(point));
            pins.push(pin);
          });

          destroyMarkers = () => {
            pins.forEach((pin) => pin.destroy());
            pins.length = 0;
          };
          destroyPlate = () => hidePlate();
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
      // Удаляем плашку, пины, затем карту.
      destroyPlate?.();
      destroyMarkers?.();
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
