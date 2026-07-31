/**
 * Cliente HTTP base de la capa repositories. Es la única capa que conoce
 * la existencia de una API — stores y páginas nunca lo usan directo.
 * Inyecta el token de Auth0 y la base URL del backend (aún no existe;
 * los repositorios lo usarán en cuanto haya endpoints reales).
 */
export function useHttpClient() {
  const config = useRuntimeConfig()

  async function request<T>(path: string, options: Record<string, unknown> = {}): Promise<T> {
    // useAuth0() usa inject() de Vue y solo funciona dentro de setup().
    // $auth0 (expuesto por plugins/auth0.client.ts vía nuxtApp.provide) es el
    // mismo cliente pero accesible desde cualquier contexto, incluyendo
    // watch() callbacks disparados fuera de setup().
    const { getAccessTokenSilently, isAuthenticated } = useNuxtApp().$auth0
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
