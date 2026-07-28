/**
 * Cliente HTTP base de la capa repositories. Es la única capa que conoce
 * la existencia de una API — stores y páginas nunca lo usan directo.
 * Inyecta el token de Auth0 y la base URL del backend (aún no existe;
 * los repositorios lo usarán en cuanto haya endpoints reales).
 */
import { useAuth0 } from '@auth0/auth0-vue'

export function useHttpClient() {
  const config = useRuntimeConfig()

  async function request<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    const { getAccessTokenSilently, isAuthenticated } = useAuth0()
    const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }

    if (isAuthenticated.value) {
      headers.Authorization = `Bearer ${await getAccessTokenSilently()}`
    }

    return $fetch<T>(path, {
      baseURL: config.public.apiBaseUrl as string,
      ...options,
      headers,
    })
  }

  return { request }
}
