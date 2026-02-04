import { env } from '@/env'

const API_BASE_URL = env.VITE_API_URL || 'http://localhost:3700'

interface ApiResponse<T> {
  success: boolean
  error: {
    code: string
    message: string
  } | null
  data: T | null
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  setAuthToken(token: string | null) {
    this.authToken = token
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.json()
      return data as ApiResponse<T>
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to server',
        },
        data: null,
      }
    }
  }

  // convenience methods
  get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', headers })
  }

  post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'POST', body, headers })
  }

  put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'PUT', body, headers })
  }

  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', headers })
  }
}

export const api = new ApiClient(API_BASE_URL)

// auth specific endpoints
export const authApi = {
  // verify privy token and get/create user
  verify: () => api.post<{ user: { id: string; walletAddress: string | null; email: string | null } }>('/auth/verify'),

  // get current user
  me: () => api.get<{ user: { id: string; walletAddress: string | null; email: string | null } }>('/auth/me'),
}
