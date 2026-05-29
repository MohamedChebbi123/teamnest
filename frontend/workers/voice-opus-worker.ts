import type { ChannelCount, SampleRate } from "libopus-wasm"

type InitMessage = {
  type: "init"
  sampleRate: SampleRate
  channels: ChannelCount
  frameSize: number
}

type EncodeMessage = {
  type: "encode"
  pcm: Float32Array
}

type DecodeMessage = {
  type: "decode"
  packet: Uint8Array
}

type VoiceWorkerMessage = InitMessage | EncodeMessage | DecodeMessage

type WorkerResponse =
  | { type: "ready" }
  | { type: "opus"; packet: Uint8Array; seq: number }
  | { type: "pcm"; pcm: Float32Array }
  | { type: "error"; message: string }

const workerScope = self as unknown as {
  postMessage: (message: unknown, transfer?: Transferable[]) => void
}

let encoder: any = null
let decoder: any = null
let initialized = false
let sequence = 0

self.onmessage = async (event: MessageEvent<VoiceWorkerMessage>) => {
  const message = event.data

  try {
    if (message.type === "init") {
      const { createEncoder, createDecoder } = await import("libopus-wasm")

      encoder = await createEncoder({
        sampleRate: message.sampleRate as SampleRate,
        channels: message.channels,
        frameSize: message.frameSize,
      })
      decoder = await createDecoder({
        sampleRate: message.sampleRate as SampleRate,
        channels: message.channels,
      })
      initialized = true
      const response: WorkerResponse = { type: "ready" }
      workerScope.postMessage(response)
      return
    }

    if (!initialized) {
      const response: WorkerResponse = { type: "error", message: "Opus worker not initialized" }
      workerScope.postMessage(response)
      return
    }

    if (message.type === "encode") {
      const opusPacket = encoder.encodeFloat(message.pcm)
      const packet = opusPacket instanceof Uint8Array ? opusPacket : new Uint8Array(opusPacket)
      const response: WorkerResponse = { type: "opus", packet, seq: sequence }
      sequence += 1
      workerScope.postMessage(response, [packet.buffer])
      return
    }

    if (message.type === "decode") {
      const pcm = decoder.decodeFloat(message.packet)
      const pcmBuffer = pcm instanceof Float32Array ? pcm : new Float32Array(pcm)
      const response: WorkerResponse = { type: "pcm", pcm: pcmBuffer }
      workerScope.postMessage(response, [pcmBuffer.buffer])
    }
  } catch (error) {
    const response: WorkerResponse = {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown opus worker error",
    }
    workerScope.postMessage(response)
  }
}
