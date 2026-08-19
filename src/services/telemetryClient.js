/**
 * telemetryClient.js — Motor inteligente de telemetría móvil, frecuencia adaptativa y cola offline
 *
 * Características:
 * 1. Monitoreo continuo de geolocalización GPS con alta precisión.
 * 2. Medición en tiempo real de batería y estado de carga.
 * 3. Frecuencia adaptativa de reporte:
 *    - En movimiento (> 5 km/h) : Cada 8 segundos
 *    - Detenido (<= 5 km/h)     : Cada 30 segundos (ahorro de batería)
 *    - Modo Pánico SOS          : Cada 3 segundos (ráfaga de emergencia)
 * 4. Almacenamiento local Store & Forward:
 *    - Sin internet: acumula paquetes en localStorage.
 *    - Con internet: envía lote completo a /api/telemetry/batch.
 * 5. Procesamiento de comandos remotos (LOCATE_NOW, etc.).
 */

import { apiClient } from './api';

const OFFLINE_QUEUE_KEY = 'einsoft_telemetry_offline_queue';

class TelemetryClient {
  constructor() {
    this.watchId = null;
    this.lastPosition = null;
    this.lastSentTime = 0;
    this.isEmergencyMode = false;
    this.deviceConfig = {
      deviceId: null,
      userId: null,
      trackerCode: null,
    };
    this.serverUrl = typeof localStorage !== 'undefined' ? (localStorage.getItem('einsoft_telemetry_url') || 'https://einsoft-gp-sbcknd.vercel.app/api/telemetry') : 'https://einsoft-gp-sbcknd.vercel.app/api/telemetry';
    this.intervalSeconds = typeof localStorage !== 'undefined' ? Number(localStorage.getItem('einsoft_telemetry_interval') || 10) : 10;
    this.listeners = new Set();
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.isTransmitting = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushOfflineQueue();
        this.notifyListeners({ type: 'network_status', isOnline: true });
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners({ type: 'network_status', isOnline: false });
      });
    }
  }

  // ─── Configurar dispositivo ──────────────────────────────────────────────────
  configure(config = {}) {
    this.deviceConfig = { ...this.deviceConfig, ...config };
    if (config.serverUrl) this.serverUrl = config.serverUrl;
    if (config.intervalSeconds) this.intervalSeconds = Number(config.intervalSeconds);
    this.flushOfflineQueue();
  }

  // ─── Suscribirse a eventos ───────────────────────────────────────────────────
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('[TelemetryClient] Listener error:', err);
      }
    }
  }

  // ─── Obtener nivel de batería ─────────────────────────────────────────────────
  async getBatteryInfo() {
    try {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const battery = await navigator.getBattery();
        return {
          level: Math.round(battery.level * 100),
          isCharging: battery.charging,
        };
      }
    } catch (_) {}
    return { level: 100, isCharging: false };
  }

  // ─── Iniciar transmisión continua ────────────────────────────────────────────
  start(config = {}) {
    this.configure(config);
    if (this.isTransmitting) return;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.notifyListeners({ type: 'error', message: 'Geolocalización no soportada en este navegador' });
      return;
    }

    this.isTransmitting = true;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePositionUpdate(pos),
      (err) => {
        console.warn('[TelemetryClient] GPS error:', err.message);
        this.notifyListeners({ type: 'error', message: err.message });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    // Active Heartbeat Timer: Forces GPS read even when stationary
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isTransmitting && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => this.handlePositionUpdate(pos),
          () => {},
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
        );
      }
    }, 15000); // Heartbeat every 15 seconds

    // Initial immediate flush
    this.flushOfflineQueue();
  }

  // ─── Detener transmisión ─────────────────────────────────────────────────────
  stop() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.isTransmitting = false;
    this.notifyListeners({ type: 'status', isTransmitting: false });
  }

  // ─── Manejo de actualización de posición ─────────────────────────────────────
  async handlePositionUpdate(pos) {
    const coords = pos.coords;
    const speedKmh = coords.speed != null && !isNaN(coords.speed) && coords.speed > 0
      ? Math.round(coords.speed * 3.6)
      : 0;

    const battery = await this.getBatteryInfo();

    const telemetryPoint = {
      deviceId: this.deviceConfig.deviceId || this.deviceConfig.userId || 'MOBILE-GPS',
      userId: this.deviceConfig.userId,
      trackerCode: this.deviceConfig.trackerCode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Math.round(coords.accuracy || 0),
      altitude: Math.round(coords.altitude || 0),
      speed: speedKmh,
      heading: Math.round(coords.heading || 0),
      battery: battery.level,
      isCharging: battery.isCharging,
      timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
      isPanic: this.isEmergencyMode,
    };

    this.lastPosition = telemetryPoint;
    this.notifyListeners({ type: 'telemetry_sample', sample: telemetryPoint });

    // Determinar intervalo según estado:
    // Pánico: cada 3s | En movimiento (>5 km/h): cada 8s | Detenido: cada 30s
    const requiredIntervalMs = this.isEmergencyMode
      ? 3000
      : speedKmh > 5
      ? 8000
      : 30000;

    const now = Date.now();
    if (now - this.lastSentTime >= requiredIntervalMs || this.isEmergencyMode) {
      await this.sendOrBufferPoint(telemetryPoint);
      this.lastSentTime = now;
    }
  }

  // ─── Forzar lectura inmediata (Comando Ping / Localizar Ahora) ────────────────
  async forceImmediateLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Sin GPS'));

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await this.handlePositionUpdate(pos);
          if (this.lastPosition) {
            await this.sendOrBufferPoint(this.lastPosition);
            this.lastSentTime = Date.now();
          }
          resolve(this.lastPosition);
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  // ─── Enviar punto o guardar en cola offline ───────────────────────────────────
  async sendOrBufferPoint(point) {
    if (!navigator.onLine) {
      this.bufferPointLocally(point);
      return;
    }

    try {
      const response = await apiClient.post('/telemetry/report', point);
      this.notifyListeners({ type: 'packet_sent', timestamp: new Date(), result: response.data });

      // Procesar comandos devueltos por el servidor
      if (Array.isArray(response.data?.commands) && response.data.commands.length > 0) {
        this.executeRemoteCommands(response.data.commands);
      }

      // Si teníamos cola pendiente acumulada, intentar sincronizarla
      this.flushOfflineQueue();
    } catch (err) {
      console.warn('[TelemetryClient] Fallo de envío, guardando en buffer local:', err.message);
      this.bufferPointLocally(point);
    }
  }

  // ─── Buffer local (IndexedDB / localStorage) ─────────────────────────────────
  bufferPointLocally(point) {
    try {
      const queue = this.getOfflineQueue();
      // Limitar a los últimos 500 puntos para no desbordar almacenamiento
      if (queue.length >= 500) queue.shift();
      queue.push(point);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      this.notifyListeners({ type: 'offline_queue_updated', count: queue.length });
    } catch (err) {
      console.error('[TelemetryClient] Error guardando en cola offline:', err);
    }
  }

  getOfflineQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  getOfflineQueueCount() {
    return this.getOfflineQueue().length;
  }

  // ─── Vaciar y sincronizar cola offline ───────────────────────────────────────
  async flushOfflineQueue() {
    if (!navigator.onLine) return;
    const queue = this.getOfflineQueue();
    if (queue.length === 0) return;

    try {
      this.notifyListeners({ type: 'sync_started', count: queue.length });
      const response = await apiClient.post('/telemetry/batch', { points: queue });

      // Limpiar cola local una vez aceptada por el servidor
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      this.notifyListeners({
        type: 'sync_completed',
        count: queue.length,
        result: response.data,
      });
    } catch (err) {
      console.warn('[TelemetryClient] Reintento de sincronización offline pospuesto:', err.message);
    }
  }

  // ─── Ejecutar comandos remotos recibidos del servidor ─────────────────────────
  async executeRemoteCommands(commands) {
    for (const cmd of commands) {
      try {
        console.log('[TelemetryClient] ⚡ Ejecutando comando remoto:', cmd.command, cmd.payload);
        if (cmd.command === 'LOCATE_NOW') {
          await this.forceImmediateLocation();
        } else if (cmd.command === 'EMERGENCY_MODE_ON') {
          this.isEmergencyMode = true;
          this.notifyListeners({ type: 'emergency_mode', active: true });
        } else if (cmd.command === 'EMERGENCY_MODE_OFF') {
          this.isEmergencyMode = false;
          this.notifyListeners({ type: 'emergency_mode', active: false });
        }

        // Enviar ACK al servidor
        if (cmd.id) {
          await apiClient.post(`/telemetry/commands/${cmd.id}/ack`, {
            response: { executed: true, at: new Date() },
          });
        }
      } catch (err) {
        console.error('[TelemetryClient] Error ejecutando comando:', err);
      }
    }
  }

  // ─── Activar / Desactivar modo de emergencia local ───────────────────────────
  setEmergencyMode(active) {
    this.isEmergencyMode = active;
    if (active && this.lastPosition) {
      this.lastPosition.isPanic = true;
      this.sendOrBufferPoint(this.lastPosition);
    }
  }
}

export const telemetryClient = new TelemetryClient();
export default telemetryClient;
