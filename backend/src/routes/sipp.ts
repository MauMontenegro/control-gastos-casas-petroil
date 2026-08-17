import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  findSippConfiguration,
  markSippConnection,
  saveSippConfiguration,
  toPublicConfiguration,
} from '../repositories/sippConfigurationRepository.js'
import { readSippCatalogs } from '../rpa/sippRpa.js'

const configurationSchema = z.object({
  environment: z.enum(['stage', 'production']),
  username: z.string().trim().min(1),
  password: z.string().optional(),
  companyId: z.string().nullable().optional(),
  companyName: z.string().nullable().optional(),
  branchId: z.string().nullable().optional(),
  branchName: z.string().nullable().optional(),
  cardId: z.string().nullable().optional(),
  cardName: z.string().nullable().optional(),
  headless: z.boolean().optional(),
})

export async function sippRoutes(app: FastifyInstance) {
  app.get('/api/sipp/configuration', async (request) => {
    return toPublicConfiguration(findSippConfiguration(request.currentUser.id))
  })

  app.put('/api/sipp/configuration', async (request, reply) => {
    const parsed = configurationSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'La configuración de SIPP no es válida' })
    }
    try {
      return toPublicConfiguration(
        saveSippConfiguration(request.currentUser.id, parsed.data),
      )
    } catch (error) {
      return reply.code(400).send({
        message: error instanceof Error ? error.message : 'No se pudo guardar la configuración',
      })
    }
  })

  app.post('/api/sipp/catalogs', async (request, reply) => {
    const body = z.object({ companyId: z.string().optional() }).safeParse(request.body ?? {})
    const configuration = findSippConfiguration(request.currentUser.id)
    if (!configuration) {
      return reply.code(409).send({ message: 'Guarda primero las credenciales de SIPP' })
    }
    try {
      const catalogs = await readSippCatalogs(
        configuration,
        body.success ? body.data.companyId : undefined,
      )
      markSippConnection(request.currentUser.id)
      return catalogs
    } catch (error) {
      request.log.error(error)
      return reply.code(502).send({
        message:
          error instanceof Error
            ? `SIPP rechazó la conexión: ${error.message}`
            : 'No fue posible conectar con SIPP',
      })
    }
  })
}
