/**
 * routingService.js — OSRM Road Snapping, Trip Segmentation & Direction Service
 *
 * - Segmenta listas cronológicas de puntos en viajes/tramos coherentes (evita saltos por el mar/aire)
 * - Convierte coordenadas GPS en geometrías reales sobre calles y autopistas usando OSRM
 * - Calcula rumbos y genera marcadores de flechas direccionales (chevrons)
 */

const routeCache = new Map();

/**
 * Calcula la distancia en metros entre dos puntos [lat, lng] usando fórmula Haversine
 */
export function getDistanceMeters(p1, p2) {
  if (!p1 || !p2 || !p1[0] || !p2[0]) return 0;
  const R = 6371e3;
  const phi1 = (p1[0] * Math.PI) / 180;
  const phi2 = (p2[0] * Math.PI) / 180;
  const deltaPhi = ((p2[0] - p1[0]) * Math.PI) / 180;
  const deltaLambda = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcula el ángulo de rumbo (bearing) en grados (0-360) desde p1 hacia p2
 */
export function calculateBearing(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = (p1[0] * Math.PI) / 180;
  const lat2 = (p2[0] * Math.PI) / 180;
  const diffLng = ((p2[1] - p1[1]) * Math.PI) / 180;

  const y = Math.sin(diffLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(diffLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/**
 * Segmenta una secuencia cronológica de waypoints en viajes/tramos independientes.
 * Rompe la ruta si:
 * 1. La diferencia de tiempo entre dos puntos consecutivos es > maxGapMinutes (default: 20 min).
 * 2. Hay un salto de distancia > maxJumpMeters (default: 2500m) que indicaría pérdida de señal o teleportación.
 * 3. La velocidad requerida entre dos puntos supera 160 km/h.
 *
 * @param {Array<Object>} waypoints Array de waypoints con { lat, lng, timestamp, speed, ... } o pares [lat, lng]
 * @param {Object} options Configuración de segmentación
 * @returns {Array<Object>} Lista de tramos/viajes { id, waypoints, coords, startTime, endTime, distanceMeters, isSinglePoint }
 */
export function segmentPointsIntoTrips(waypoints, options = {}) {
  if (!waypoints || waypoints.length === 0) return [];

  const maxGapMinutes = options.maxGapMinutes || 20;
  const maxJumpMeters = options.maxJumpMeters || 3000;

  // Normalizar puntos a formato homogéneo
  const normalized = waypoints
    .map((w, idx) => {
      let lat, lng, time, speed, address;
      if (Array.isArray(w)) {
        lat = w[0];
        lng = w[1];
        time = null;
        speed = 0;
      } else {
        lat = w.lat ?? w.latitude ?? w.gps?.latitude ?? w.location?.coordinates?.[1];
        lng = w.lng ?? w.longitude ?? w.gps?.longitude ?? w.location?.coordinates?.[0];
        time = w.timestamp ? new Date(w.timestamp) : null;
        speed = w.speed ?? w.gps?.speed ?? 0;
        address = w.address ?? w.gps?.address;
      }

      if (!lat || !lng || (lat === 0 && lng === 0)) return null;
      // Filtro geográfico amplio Chile (-56 a -17 lat, -82 a -65 lng)
      if (lat < -56 || lat > -17 || lng < -82 || lng > -65) return null;

      return {
        originalIndex: idx,
        lat,
        lng,
        coord: [lat, lng],
        time,
        speed,
        address,
        raw: w,
      };
    })
    .filter(Boolean);

  if (normalized.length === 0) return [];

  const trips = [];
  let currentTripWaypoints = [normalized[0]];

  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const curr = normalized[i];
    const dist = getDistanceMeters(prev.coord, curr.coord);

    let shouldBreak = false;

    // Criterio 1: Salto temporal
    if (prev.time && curr.time) {
      const diffMinutes = (curr.time.getTime() - prev.time.getTime()) / 60000;
      if (diffMinutes > maxGapMinutes) {
        shouldBreak = true;
      } else if (diffMinutes > 0) {
        // Velocidad implícita
        const speedKmh = (dist / (diffMinutes * 60)) * 3.6;
        if (speedKmh > 160 && dist > 1500) {
          shouldBreak = true;
        }
      }
    }

    // Criterio 2: Salto espacial grande sin tiempo disponible
    if (dist > maxJumpMeters && (!prev.time || !curr.time)) {
      shouldBreak = true;
    }

    // Criterio 3: Cruce anómalo directo por el mar (ej: Playa Ancha <-> Placeres en un solo salto sin puntos intermedios)
    // Coordenadas aproximadas de la bahía de Valparaíso
    const isValpoBayCross =
      (prev.lng < -71.61 && curr.lng > -71.59 && dist > 2000) ||
      (prev.lng > -71.59 && curr.lng < -71.61 && dist > 2000);
    if (isValpoBayCross && dist > 2000) {
      // Si el salto es mayor a 2km directo entre ambos lados de la bahía sin puntos en el Almendral / Errázuriz
      const diffMin = prev.time && curr.time ? (curr.time.getTime() - prev.time.getTime()) / 60000 : 0;
      if (diffMin > 10 || !prev.time) {
        shouldBreak = true;
      }
    }

    if (shouldBreak) {
      // Guardar tramo anterior
      if (currentTripWaypoints.length > 0) {
        trips.push(buildTripObject(trips.length + 1, currentTripWaypoints));
      }
      currentTripWaypoints = [curr];
    } else {
      currentTripWaypoints.push(curr);
    }
  }

  if (currentTripWaypoints.length > 0) {
    trips.push(buildTripObject(trips.length + 1, currentTripWaypoints));
  }

  return trips;
}

function buildTripObject(id, waypoints) {
  const coords = waypoints.map((w) => w.coord);
  let totalDistance = 0;
  for (let i = 1; i < coords.length; i++) {
    totalDistance += getDistanceMeters(coords[i - 1], coords[i]);
  }

  const first = waypoints[0];
  const last = waypoints[waypoints.length - 1];

  const startTime = first.time;
  const endTime = last.time;
  const durationMinutes =
    startTime && endTime ? Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60000)) : 0;

  const speeds = waypoints.map((w) => w.speed).filter((s) => s > 0);
  const avgSpeed = speeds.length > 0 ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  return {
    id,
    waypoints: waypoints.map((w) => w.raw),
    coords,
    startCoord: first.coord,
    endCoord: last.coord,
    startTime,
    endTime,
    durationMinutes,
    distanceKm: (totalDistance / 1000).toFixed(1),
    distanceMeters: Math.round(totalDistance),
    avgSpeed,
    maxSpeed,
    pointCount: waypoints.length,
    startAddress: first.address || null,
    endAddress: last.address || null,
  };
}

/**
 * Genera puntos intermedios con rumbo (bearing) para renderizar flechas direccionales (chevrons)
 * espaciadas a lo largo de una ruta vial.
 *
 * @param {Array<[number, number]>} coords Array de [lat, lng]
 * @param {number} spacingMeters Espaciado aproximado entre flechas (default: 350m)
 * @returns {Array<{ position: [number, number], bearing: number }>}
 */
export function generateDirectionChevrons(coords, spacingMeters = 350) {
  if (!coords || coords.length < 2) return [];

  const chevrons = [];
  let accumulatedDistance = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const segmentDist = getDistanceMeters(p1, p2);

    accumulatedDistance += segmentDist;

    if (accumulatedDistance >= spacingMeters || (i === 0 && segmentDist > 100)) {
      const bearing = calculateBearing(p1, p2);
      // Colocar la flecha a mitad de segmento
      const midLat = (p1[0] + p2[0]) / 2;
      const midLng = (p1[1] + p2[1]) / 2;

      chevrons.push({
        position: [midLat, midLng],
        bearing: Math.round(bearing),
      });

      accumulatedDistance = 0;
    }
  }

  return chevrons;
}

/**
 * Obtiene la geometría de ruta real siguiendo calles entre dos o más puntos usando OSRM
 * @param {Array<[number, number]>} points Array de coordenadas [lat, lng]
 * @returns {Promise<Array<[number, number]>>} Array de coordenadas [lat, lng] que siguen las calles
 */
export async function getRoadSnappedRoute(points) {
  if (!points || points.length < 2) return points || [];

  // Si son solo 2 puntos y están muy cerca (< 20m), retornar directo
  if (points.length === 2) {
    const [p1, p2] = points;
    const dist = Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
    if (dist < 0.0002) return points;
  }

  // Si hay más de 25 puntos, procesar en bloques (chunks) para no perder detalle vial
  if (points.length > 40) {
    return snapLongRouteInChunks(points);
  }

  // Limitar número de puntos de entrada para no sobrecargar OSRM (máx 25 puntos clave)
  const sampledPoints = samplePoints(points, 25);

  // Clave de caché
  const cacheKey = sampledPoints.map((p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`).join(';');
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  try {
    // Formato OSRM: lng,lat;lng,lat
    const coordsString = sampledPoints.map((p) => `${p[1].toFixed(6)},${p[0].toFixed(6)}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]?.geometry?.coordinates) {
      // OSRM retorna [lng, lat], convertir a Leaflet [lat, lng]
      const roadCoordinates = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);

      // Guardar en caché (limitar tamaño a 300 entradas)
      if (routeCache.size > 300) {
        const firstKey = routeCache.keys().next().value;
        routeCache.delete(firstKey);
      }
      routeCache.set(cacheKey, roadCoordinates);

      return roadCoordinates;
    }
  } catch (_) {
    // Fallback silencioso sin spam
  }

  // Fallback: retornar puntos originales
  return points;
}

/**
 * Snapping de rutas largas dividiéndolas en tramos de 20 puntos con solapamiento
 */
async function snapLongRouteInChunks(points) {
  const chunkSize = 20;
  const result = [];

  for (let i = 0; i < points.length; i += chunkSize - 1) {
    const chunk = points.slice(i, i + chunkSize);
    if (chunk.length < 2) continue;

    const snappedChunk = await getRoadSnappedRoute(chunk);
    if (result.length > 0 && snappedChunk.length > 0) {
      // Omitir primer punto para evitar duplicado en la unión
      result.push(...snappedChunk.slice(1));
    } else {
      result.push(...snappedChunk);
    }
  }

  return result.length > 0 ? result : points;
}

/**
 * Snapping vial de múltiples viajes/tramos de forma paralela y segura
 * @param {Array<Object>} trips Lista de tramos obtenida de segmentPointsIntoTrips
 * @returns {Promise<Array<Array<[number, number]>>>} Array de geometrías viales por tramo
 */
export async function getMultiSegmentSnappedRoute(trips) {
  if (!trips || trips.length === 0) return [];

  const promises = trips.map(async (trip) => {
    if (!trip.coords || trip.coords.length < 2) {
      return trip.coords || [];
    }
    try {
      const snapped = await getRoadSnappedRoute(trip.coords);
      return snapped && snapped.length >= 2 ? snapped : trip.coords;
    } catch (_) {
      return trip.coords;
    }
  });

  return Promise.all(promises);
}

function samplePoints(pts, max) {
  if (!pts || pts.length <= max) return pts;
  const result = [pts[0]];
  const step = (pts.length - 1) / (max - 1);
  for (let i = 1; i < max - 1; i++) {
    result.push(pts[Math.floor(i * step)]);
  }
  result.push(pts[pts.length - 1]);
  return result;
}
