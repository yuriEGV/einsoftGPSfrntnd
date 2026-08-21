/**
 * routingService.js — OSRM Road Snapping & Route Interpolation Service
 *
 * Convierte pares o secuencias de coordenadas GPS en geometrías reales
 * que siguen las calles, autopistas y curvas del mapa vial (Camino La Pólvora, Av. Playa Ancha, etc.)
 */

const routeCache = new Map();

/**
 * Obtiene la geometría de ruta real siguiendo calles entre dos o más puntos
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

  // Generar clave de caché para no repetir llamadas
  const cacheKey = points.map(p => `${p[0].toFixed(5)},${p[1].toFixed(5)}`).join(';');
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  try {
    // Formato OSRM: lng,lat;lng,lat
    const coordsString = points.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=false`;

    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error('OSRM request failed');

    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]?.geometry?.coordinates) {
      // OSRM retorna [lng, lat], convertir a Leaflet [lat, lng]
      const roadCoordinates = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      
      // Guardar en caché (limitar tamaño a 200 entradas)
      if (routeCache.size > 200) {
        const firstKey = routeCache.keys().next().value;
        routeCache.delete(firstKey);
      }
      routeCache.set(cacheKey, roadCoordinates);

      return roadCoordinates;
    }
  } catch (err) {
    console.warn('[RoutingService] No se pudo obtener ruta ajustada a calles (usando fallback directo):', err.message);
  }

  // Fallback: retornar puntos originales si OSRM no responde
  return points;
}
