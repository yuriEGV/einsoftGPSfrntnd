import { useMemo } from 'react'

/**
 * Static permission definitions matching backend
 */
export const PERMISSIONS = {
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  VEHICLES_VIEW: 'vehicles.view',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_DELETE: 'vehicles.delete',

  DEVICES_VIEW: 'devices.view',
  DEVICES_CREATE: 'devices.create',
  DEVICES_UPDATE: 'devices.update',
  DEVICES_DELETE: 'devices.delete',

  LOCATIONS_VIEW: 'locations.view',
  LOCATIONS_HISTORY: 'locations.history',
  LOCATIONS_OWN: 'locations.own',

  ALERTS_VIEW: 'alerts.view',
  ALERTS_ACKNOWLEDGE: 'alerts.acknowledge',
  ALERTS_RESOLVE: 'alerts.resolve',

  PANIC_CREATE: 'panic.create',
  PANIC_VIEW: 'panic.view',
  PANIC_ACKNOWLEDGE: 'panic.acknowledge',
  PANIC_RESOLVE: 'panic.resolve',

  GEOFENCES_VIEW: 'geofences.view',
  GEOFENCES_CREATE: 'geofences.create',
  GEOFENCES_UPDATE: 'geofences.update',
  GEOFENCES_DELETE: 'geofences.delete',

  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',

  AUDIT_VIEW: 'audit.view',

  DEVICE_OWN_VIEW: 'device.own.view',
  NOTIFICATIONS_OWN: 'notifications.own',
  PROFILE_OWN_UPDATE: 'profile.own.update',

  ALL: '*',
}

export const ROLE_DEFAULT_PERMISSIONS = {
  superadmin: ['*'],
  admin: [
    'users.*', 'vehicles.*', 'devices.*', 'locations.*',
    'alerts.*', 'panic.view', 'panic.acknowledge', 'panic.resolve',
    'geofences.*', 'reports.*', 'audit.view'
  ],
  operator: [
    'vehicles.view', 'devices.view', 'locations.view', 'locations.history',
    'alerts.view', 'alerts.acknowledge', 'alerts.resolve',
    'panic.view', 'panic.acknowledge', 'panic.resolve',
    'geofences.view', 'reports.view'
  ],
  supervisor: [
    'users.view', 'vehicles.view', 'devices.view', 'locations.view', 'locations.history',
    'alerts.view', 'panic.view', 'panic.acknowledge', 'panic.resolve',
    'geofences.view', 'reports.view', 'reports.export'
  ],
  driver: [
    'locations.own', 'panic.create', 'panic.view',
    'device.own.view', 'notifications.own', 'profile.own.update'
  ],
  mobile_gps_user: [
    'locations.own', 'panic.create', 'panic.view',
    'device.own.view', 'notifications.own', 'profile.own.update'
  ],
  client: [
    'vehicles.view', 'locations.view', 'alerts.view', 'reports.view'
  ],
  auditor: [
    'users.view', 'vehicles.view', 'devices.view', 'locations.view', 'locations.history',
    'alerts.view', 'panic.view', 'geofences.view', 'reports.view', 'audit.view'
  ],
}

/**
 * usePermissions Hook
 */
export function usePermissions() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
    } catch {
      return {}
    }
  }, [])

  // Normalize legacy roles if present in cache, fallback to admin for open/test context
  let role = user.role || 'admin'
  if (role === 'fleet_manager') role = 'admin'
  if (role === 'independent') role = 'mobile_gps_user'

  const effectivePermissions = useMemo(() => {
    const defaultPerms = ROLE_DEFAULT_PERMISSIONS[role] || []
    const customPerms = Array.isArray(user.permissions) ? user.permissions : []
    return Array.from(new Set([...defaultPerms, ...customPerms]))
  }, [role, user.permissions])

  const hasPermission = (required) => {
    if (!required) return true
    if (effectivePermissions.includes('*')) return true
    if (effectivePermissions.includes(required)) return true

    const [category] = required.split('.')
    if (effectivePermissions.includes(`${category}.*`)) return true

    return false
  }

  const isSuperAdmin = role === 'superadmin'
  const isAdmin = role === 'admin' || isSuperAdmin
  const isOperator = role === 'operator'
  const isSupervisor = role === 'supervisor'
  const isDriver = role === 'driver'
  const isMobileGpsUser = role === 'mobile_gps_user'
  const isClient = role === 'client'
  const isAuditor = role === 'auditor'

  const canWrite = !['auditor', 'client'].includes(role)
  const isReadOnly = ['auditor', 'client'].includes(role)

  return {
    user,
    role,
    effectivePermissions,
    hasPermission,
    isSuperAdmin,
    isAdmin,
    isOperator,
    isSupervisor,
    isDriver,
    isMobileGpsUser,
    isClient,
    isAuditor,
    canWrite,
    isReadOnly,
  }
}
