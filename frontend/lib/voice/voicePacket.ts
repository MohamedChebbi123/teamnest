const HEADER_SIZE = 10

export type VoicePacket = {
  seq: number
  timestampMs: number
  payload: Uint8Array
}

export function buildVoicePacket(seq: number, timestampMs: number, payload: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(HEADER_SIZE + payload.byteLength)
  const view = new DataView(buffer)
  view.setUint32(0, seq)
  view.setUint32(4, timestampMs)
  view.setUint16(8, payload.byteLength)
  new Uint8Array(buffer, HEADER_SIZE).set(payload)
  return buffer
}

export function parseVoicePacket(data: ArrayBuffer): VoicePacket | null {
  if (data.byteLength < HEADER_SIZE) {
    return null
  }

  const view = new DataView(data)
  const seq = view.getUint32(0)
  const timestampMs = view.getUint32(4)
  const payloadLength = view.getUint16(8)
  const expectedLength = data.byteLength - HEADER_SIZE

  if (payloadLength !== expectedLength) {
    return null
  }

  const payloadView = new Uint8Array(data, HEADER_SIZE, payloadLength)
  const payload = new Uint8Array(payloadLength)
  payload.set(payloadView)

  return {
    seq,
    timestampMs,
    payload,
  }
}
