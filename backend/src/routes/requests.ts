import { createWriteStream, mkdirSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { basename, extname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config.js'
import { findSippConfiguration } from '../repositories/sippConfigurationRepository.js'
import {
  createRequest,
  findRequest,
  listRequests,
  toFundRequest,
  updateRequestCapture,
} from '../repositories/requestRepository.js'
import { captureRequestInSipp } from '../rpa/sippRpa.js'

const createSchema = z.object({
  motive: z.string().trim().min(1).max(300),
  amount: z.coerce.number().positive(),
  sippCardId: z.string().min(1),
  sippCardName: z.string().optional(),
  incrementType: z.enum(['0', '1', '2']),
})

async function readCreatePayload(request: Parameters<FastifyInstance['post']>[1] extends never ? never : any) {
  const fields: Record<string, string> = {}
  let supportPath: string | undefined
  let supportName: string | undefined
  mkdirSync(config.UPLOAD_DIR, { recursive: true })

  for await (const part of request.parts()) {
    if (part.type === 'file') {
      const extension = extname(part.filename || '').slice(0, 12)
      const filename = `${randomUUID()}${extension}`
      supportPath = join(config.UPLOAD_DIR, filename)
      supportName = basename(part.filename || 'soporte')
      await pipeline(part.file, createWriteStream(supportPath, { flags: 'wx' }))
    } else {
      fields[part.fieldname] = String(part.value)
    }
  }
  return { fields, supportPath, supportName }
}

export async function requestRoutes(app: FastifyInstance) {
  app.get('/api/fund-requests', async (request) => {
    return listRequests(request.currentUser.id).map(toFundRequest)
  })

  app.post('/api/fund-requests', async (request, reply) => {
    const contentType = request.headers['content-type'] || ''
    let raw: unknown = request.body
    let supportPath: string | undefined
    let supportName: string | undefined
    if (contentType.includes('multipart/form-data')) {
      const multipart = await readCreatePayload(request)
      raw = multipart.fields
      supportPath = multipart.supportPath
      supportName = multipart.supportName
    }
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'La solicitud no contiene todos los campos requeridos',
        issues: parsed.error.issues,
      })
    }
    const sippConfiguration = findSippConfiguration(request.currentUser.id)
    if (!sippConfiguration?.branch_id || !sippConfiguration.branch_name) {
      return reply.code(409).send({
        message: 'Configura empresa y sucursal de SIPP antes de crear la solicitud',
      })
    }
    if (
      sippConfiguration.card_id &&
      parsed.data.sippCardId !== sippConfiguration.card_id
    ) {
      return reply.code(400).send({
        message: 'La tarjeta seleccionada no corresponde a la configuración actual de SIPP',
      })
    }
    const currentDate = new Date().toISOString().slice(0, 10)
    const created = createRequest(request.currentUser.id, {
      requiredDate: currentDate,
      concept: parsed.data.motive,
      branch: sippConfiguration.branch_name,
      amount: parsed.data.amount,
      expenseType: 'Incremento SIPP',
      costCenter: sippConfiguration.branch_id,
      provider: 'SIPP',
      sippCardId: parsed.data.sippCardId,
      sippCardName: parsed.data.sippCardName,
      incrementType: parsed.data.incrementType,
      supportPath,
      supportName,
    })
    return reply.code(201).send(toFundRequest(created))
  })

  app.post('/api/fund-requests/:id/capture-sipp', async (request, reply) => {
    const parameters = z.object({ id: z.string() }).parse(request.params)
    const fundRequest = findRequest(request.currentUser.id, parameters.id)
    if (!fundRequest) return reply.code(404).send({ message: 'Solicitud no encontrada' })
    if (fundRequest.status !== 'borrador' && fundRequest.status !== 'correccion') {
      return reply.code(409).send({ message: 'La solicitud ya fue procesada' })
    }
    const configuration = findSippConfiguration(request.currentUser.id)
    if (!configuration) {
      return reply.code(409).send({ message: 'Configura primero tu sesión de SIPP' })
    }

    updateRequestCapture(request.currentUser.id, fundRequest.id, 'capturando')
    try {
      const result = await captureRequestInSipp(configuration, fundRequest)
      const updated = updateRequestCapture(request.currentUser.id, fundRequest.id, 'capturada', {
        sippFolio: result.folio,
      })
      return toFundRequest(updated!)
    } catch (error) {
      request.log.error(error)
      const message = error instanceof Error ? error.message : 'Error desconocido al capturar en SIPP'
      updateRequestCapture(request.currentUser.id, fundRequest.id, 'correccion', {
        error: message,
      })
      return reply.code(502).send({ message: `No se pudo capturar en SIPP: ${message}` })
    }
  })
}
