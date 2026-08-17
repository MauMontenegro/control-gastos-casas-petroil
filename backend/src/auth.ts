import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { FastifyInstance } from 'fastify'
import { config } from './config.js'

const jwks =
  config.AUTH0_DOMAIN &&
  createRemoteJWKSet(new URL(`https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`))

export function registerAuthentication(app: FastifyInstance) {
  app.addHook('preHandler', async (request, reply) => {
    if (request.url === '/api/health') return

    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) {
      if (config.ALLOW_DEVELOPMENT_USER && process.env.NODE_ENV !== 'production') {
        request.currentUser = { id: 'local-development-user' }
        return
      }
      return reply.code(401).send({ message: 'Se requiere una sesión válida' })
    }

    if (!jwks || !config.AUTH0_DOMAIN || !config.AUTH0_AUDIENCE) {
      return reply.code(500).send({ message: 'Auth0 no está configurado en el backend' })
    }

    try {
      const result = await jwtVerify(authorization.slice(7), jwks, {
        issuer: `https://${config.AUTH0_DOMAIN}/`,
        audience: config.AUTH0_AUDIENCE,
      })
      if (!result.payload.sub) throw new Error('Token sin subject')
      request.currentUser = { id: result.payload.sub }
    } catch {
      return reply.code(401).send({ message: 'La sesión no es válida o expiró' })
    }
  })
}
