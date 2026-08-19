/**
 * deviceState.js — Clasificación dinámica en 3 Estados de Conexión en Frontend:
 *   🟢 ONLINE  : Reportó hace <= 30 segundos
 *   🟡 STALE   : Reportó hace entre 31s y 3 minutos (sin actualización reciente)
 *   🔴 OFFLINE : No reporta hace más de 3 minutos (desconectado)
 */

export function getDeviceConnectionStatus(lastUpdateDate) {
  if (!lastUpdateDate) {
    return {
      status: 'offline',
      secondsAgo: Infinity,
      label: 'Sin conexión',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200',
      dotClass: 'bg-gray-400',
      icon: '⚪',
      isLive: false,
    };
  }

  const lastSeenMs = new Date(lastUpdateDate).getTime();
  if (isNaN(lastSeenMs)) {
    return {
      status: 'offline',
      secondsAgo: Infinity,
      label: 'Fecha inválida',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200',
      dotClass: 'bg-gray-400',
      icon: '⚪',
      isLive: false,
    };
  }

  const diffSeconds = Math.max(0, Math.round((Date.now() - lastSeenMs) / 1000));

  if (diffSeconds <= 30) {
    return {
      status: 'online',
      secondsAgo: diffSeconds,
      label: diffSeconds < 5 ? '🟢 En vivo (<5s)' : `🟢 En línea (${diffSeconds}s)`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
      dotClass: 'bg-emerald-500 animate-ping',
      icon: '🟢',
      isLive: true,
    };
  }

  if (diffSeconds <= 180) {
    const mins = Math.floor(diffSeconds / 60);
    const secs = diffSeconds % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return {
      status: 'stale',
      secondsAgo: diffSeconds,
      label: `🟡 Sin actualización (${timeStr})`,
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-medium',
      dotClass: 'bg-amber-500',
      icon: '🟡',
      isLive: false,
    };
  }

  const mins = Math.round(diffSeconds / 60);
  const hrs = Math.floor(mins / 60);
  const timeStr = hrs >= 1 ? `hace ${hrs}h` : `hace ${mins} min`;

  return {
    status: 'offline',
    secondsAgo: diffSeconds,
    label: `🔴 Desconectado (${timeStr})`,
    badgeClass: 'bg-red-100 text-red-800 border border-red-200 font-medium',
    dotClass: 'bg-red-500',
    icon: '🔴',
    isLive: false,
  };
}
