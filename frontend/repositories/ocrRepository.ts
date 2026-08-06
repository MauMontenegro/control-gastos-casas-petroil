import type { OcrExtractionResult } from '~/types'
import { useHttpClient } from '~/repositories/httpClient'

export function useOcrRepository() {
  async function extractFundRequestDocument(file: File): Promise<OcrExtractionResult> {
    const body = new FormData()
    body.append('document', file)
    return useHttpClient().request<OcrExtractionResult>('/ocr/fund-request-document', {
      method: 'POST',
      body,
    })
  }

  return { extractFundRequestDocument }
}
