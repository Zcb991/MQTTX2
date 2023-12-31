import historyMessagePayloadService from '@/utils/api/historyMessagePayloadService'
import historyMessageHeaderService from '@/utils/api/historyMessageHeaderService'

export const hasMessagePayloadID = async (data: HistoryMessagePayloadModel): Promise<string | null> => {
  const payloads = await historyMessagePayloadService.getAll()
  if (payloads) {
    const res = payloads.find((el: HistoryMessagePayloadModel) => {
      return data.payload === el.payload && data.payloadType === el.payloadType
    })
    return res?.id ?? null
  }
  return null
}

export const hasMessageHeaderID = async (data: HistoryMessageHeaderModel): Promise<string | null> => {
  const headers = await historyMessageHeaderService.getAll()
  if (headers) {
    const res = headers.find((el: HistoryMessageHeaderModel) => {
      return data.qos === el.qos && data.topic === el.topic && data.retain === el.retain
    })
    return res?.id ?? null
  }
  return null
}

export default {}
