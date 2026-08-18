import { renderHook } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePermissions, PERMISSIONS } from '../hooks/usePermissions'

describe('usePermissions Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('provides full permissions for superadmin', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'superadmin' }))
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isSuperAdmin).toBe(true)
    expect(result.current.isAdmin).toBe(true)
    expect(result.current.canWrite).toBe(true)
    expect(result.current.hasPermission(PERMISSIONS.USERS_CREATE)).toBe(true)
    expect(result.current.hasPermission('any.custom.permission')).toBe(true)
  })

  it('restricts auditor to read-only', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'auditor' }))
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isAuditor).toBe(true)
    expect(result.current.isReadOnly).toBe(true)
    expect(result.current.canWrite).toBe(false)
    expect(result.current.hasPermission(PERMISSIONS.USERS_VIEW)).toBe(true)
    expect(result.current.hasPermission(PERMISSIONS.USERS_CREATE)).toBe(false)
  })

  it('gives mobile_gps_user own permissions and panic capabilities', () => {
    localStorage.setItem('user', JSON.stringify({ role: 'mobile_gps_user' }))
    const { result } = renderHook(() => usePermissions())

    expect(result.current.isMobileGpsUser).toBe(true)
    expect(result.current.hasPermission(PERMISSIONS.PANIC_CREATE)).toBe(true)
    expect(result.current.hasPermission(PERMISSIONS.LOCATIONS_OWN)).toBe(true)
    expect(result.current.hasPermission(PERMISSIONS.VEHICLES_CREATE)).toBe(false)
  })
})
