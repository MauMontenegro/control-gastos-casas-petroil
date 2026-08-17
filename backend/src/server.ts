import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import { config } from './config.js'
import './database.js'
import { registerAuthentication } from './auth.js'
import { requestRoutes } from './routes/requests.js'
import { sippRoutes } from './routes/sipp.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: config.FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'OPTIONS'],
})
await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
})

registerAuthentication(app)
await app.register(sippRoutes)
await app.register(requestRoutes)

app.get('/api/health', async () => ({ status: 'ok' }))

app.setErrorHandler((error: FastifyError, request, reply) => {
  request.log.error(error)
  reply.code(error.statusCode && error.statusCode < 500 ? error.statusCode : 500).send({
    message: error.statusCode && error.statusCode < 500 ? error.message : 'Error interno del servidor',
  })
})

await app.listen({ port: config.PORT, host: config.HOST })
