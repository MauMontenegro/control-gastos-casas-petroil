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
})
