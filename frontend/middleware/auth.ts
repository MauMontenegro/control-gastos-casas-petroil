import { useAuth0 } from '@auth0/auth0-vue'

// Desactivado temporalmente: se renombró de auth.global.ts a auth.ts para
// dejar de aplicarse a todas las rutas mientras se prueba la app en local
// sin credenciales reales de Auth0. Para reactivarlo, renombrar de vuelta
// a auth.global.ts (o registrarlo por página con definePageMeta).
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || to.path === '/callback') return

  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  // SPA (ssr:false): en el primer render Auth0 aún está resolviendo la
  // sesión (isLoading=true); no redirigir hasta que termine de resolver.
  if (!isLoading.value && !isAuthenticated.value) {
    return loginWithRedirect({ appState: { target: to.fullPath } })
  }
})
