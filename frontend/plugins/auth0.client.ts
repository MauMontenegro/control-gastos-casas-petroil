import { createAuth0 } from '@auth0/auth0-vue'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const auth0 = createAuth0({
    domain: config.public.auth0Domain as string,
    clientId: config.public.auth0ClientId as string,
    authorizationParams: {
      redirect_uri: config.public.auth0RedirectUri as string,
      audience: config.public.auth0Audience as string,
    },
  })

  nuxtApp.vueApp.use(auth0)

  // Se expone también vía provide de Nuxt (no solo el provide/inject de Vue):
  // useAuth0() usa inject() y requiere una instancia de componente activa, lo
  // que falla en código que corre fuera de setup() (p.ej. dentro de un watch()
  // que se dispara de forma asíncrona, como en httpClient.ts). useNuxtApp()
  // sí funciona en esos contextos.
  return {
    provide: { auth0 },
  }
})
