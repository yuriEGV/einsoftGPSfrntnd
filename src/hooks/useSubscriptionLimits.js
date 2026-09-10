import { useQuery, useMutation, useQueryClient } from 'react-query'
import { apiClient, safeStorage } from '../services/api'

/**
 * useSubscriptionLimits
 * Hook centralizado que maneja:
 * - isPaid: boolean (cuenta con suscripción activa o superadmin)
 * - isBlocked: boolean (ha agotado su 1 consulta diaria en modo gratuito)
 * - dailyLimit: 1 para usuarios gratuitos, Infinity para usuarios pagados
 * - queriesUsed: número de consultas realizadas hoy
 * - remainingQueries: consultas restantes hoy (0 o 1)
 * - consumeQuery(): ejecuta una consulta de ubicación diaria y actualiza el contador
 * - activateDemoPlan(): activa un plan de prueba o pago inmediato
 * - resetDemoQuery(): reinicia el contador para pruebas
 */
export function useSubscriptionLimits() {
  const queryClient = useQueryClient()
  const token = safeStorage.get('token')
  const user = JSON.parse(safeStorage.get('user') || '{}')

  const { data, isLoading, refetch } = useQuery(
    'subscription-usage-status',
    async () => {
      try {
        const res = await apiClient.get('/payments/usage-status')
        return res.data
      } catch (err) {
        return {
          isPaid: user.role === 'superadmin',
          isBlocked: false,
          dailyLimit: user.role === 'superadmin' ? Infinity : 1,
          queriesUsed: 0,
          remainingQueries: user.role === 'superadmin' ? Infinity : 1,
          maxDevices: 1,
          planName: 'Modo Demo / Gratuito',
        }
      }
    },
    {
      enabled: !!token,
      staleTime: 1000 * 15,
      refetchOnWindowFocus: true,
    }
  )

  const consumeQueryMutation = useMutation(
    async () => {
      const res = await apiClient.post('/payments/query-location')
      return res.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-usage-status')
        queryClient.invalidateQueries('vehicles')
        queryClient.invalidateQueries('peopleTrackers')
      },
      onError: () => {
        queryClient.invalidateQueries('subscription-usage-status')
      },
    }
  )

  const activatePlanMutation = useMutation(
    async (planCode) => {
      const res = await apiClient.post('/payments/demo-activate', { planCode })
      return res.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-usage-status')
        queryClient.invalidateQueries('subscription')
        queryClient.invalidateQueries('vehicles')
        queryClient.invalidateQueries('peopleTrackers')
      },
    }
  )

  const resetQueryMutation = useMutation(
    async () => {
      const res = await apiClient.post('/payments/reset-daily-query')
      return res.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('subscription-usage-status')
        queryClient.invalidateQueries('vehicles')
      },
    }
  )

  const isSuperadmin = user.role === 'superadmin'
  const isPaid = isSuperadmin || !!data?.isPaid
  const dailyLimit = isPaid ? Infinity : (data?.dailyLimit ?? 1)
  const queriesUsed = isPaid ? 0 : (data?.queriesUsed ?? 0)
  const remainingQueries = isPaid ? Infinity : Math.max(0, dailyLimit - queriesUsed)
  const isBlocked = isPaid ? false : (queriesUsed >= dailyLimit || !!data?.isBlocked)

  return {
    isPaid,
    isSuperadmin,
    isBlocked,
    dailyLimit,
    queriesUsed,
    remainingQueries,
    maxDevices: isPaid ? (data?.maxDevices || 10) : 1,
    planName: data?.planName || (isPaid ? 'Plan Premium Activo' : 'Modo Demo / Gratuito'),
    planCode: data?.planCode || (isPaid ? 'PAID' : 'FREE_DEMO'),
    expiresAt: data?.expiresAt,
    daysLeft: data?.daysLeft,
    isLoading,
    refetchUsage: refetch,
    consumeQuery: () => consumeQueryMutation.mutateAsync(),
    isConsuming: consumeQueryMutation.isLoading,
    activatePlan: (code) => activatePlanMutation.mutateAsync(code),
    isActivating: activatePlanMutation.isLoading,
    resetDailyQuery: () => resetQueryMutation.mutateAsync(),
    isResetting: resetQueryMutation.isLoading,
  }
}
