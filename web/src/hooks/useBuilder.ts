import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { builderApi } from '@/lib/api'
import { useAuthContext } from '@/providers/AuthProvider'

// -- query hooks --
// all gated on isBackendSynced so they don't fire before the auth token is set

export function useBuilderProfile() {
  const { isBackendSynced } = useAuthContext()

  return useQuery({
    queryKey: ['builder', 'me'],
    queryFn: async () => {
      const res = await builderApi.me()
      if (!res.success || !res.data) return null
      return res.data.builder
    },
    enabled: isBackendSynced,
    retry: false,
  })
}

export function useBuilderApiKeys() {
  const { isBackendSynced } = useAuthContext()

  return useQuery({
    queryKey: ['builder', 'api-keys'],
    queryFn: async () => {
      const res = await builderApi.listApiKeys()
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch keys')
      return res.data.keys
    },
    enabled: isBackendSynced,
  })
}

export function useBuilderGames() {
  const { isBackendSynced } = useAuthContext()

  return useQuery({
    queryKey: ['builder', 'games'],
    queryFn: async () => {
      const res = await builderApi.listGames()
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch games')
      return res.data.games
    },
    enabled: isBackendSynced,
  })
}

export function useBuilderGame(slug: string) {
  const { isBackendSynced } = useAuthContext()

  return useQuery({
    queryKey: ['builder', 'games', slug],
    queryFn: async () => {
      const res = await builderApi.getGame(slug)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch game')
      return res.data.game
    },
    enabled: isBackendSynced && !!slug,
  })
}

export function useBuilderAnalytics(period?: string) {
  const { isBackendSynced } = useAuthContext()

  return useQuery({
    queryKey: ['builder', 'analytics', period],
    queryFn: async () => {
      const res = await builderApi.analytics(period)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to fetch analytics')
      return res.data
    },
    enabled: isBackendSynced,
  })
}

// -- mutation hooks --

export function useBuilderRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; website?: string; email?: string }) => {
      const res = await builderApi.register(data)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Registration failed')
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder'] })
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { environment: string }) => {
      const res = await builderApi.createApiKey(data)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to create key')
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder', 'api-keys'] })
    },
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await builderApi.deleteApiKey(id)
      if (!res.success) throw new Error(res.error?.message || 'Failed to delete key')
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder', 'api-keys'] })
    },
  })
}

export function useCreateGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await builderApi.createGame(data)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to create game')
      return res.data.game
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder', 'games'] })
    },
  })
}

export function useUpdateGame(slug: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await builderApi.updateGame(slug, data)
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to update game')
      return res.data.game
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['builder', 'games'] })
    },
  })
}
