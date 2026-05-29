class VoiceCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.frameSize = 960
    this.buffer = []
    this.enabled = true

    this.port.onmessage = (event) => {
      const data = event.data || {}
      if (data.type === "configure") {
        if (typeof data.frameSize === "number") {
          this.frameSize = data.frameSize
        }
        if (typeof data.enabled === "boolean") {
          this.enabled = data.enabled
        }
      }
    }
  }

  process(inputs) {
    const input = inputs[0]
    if (!input || input.length === 0) {
      return true
    }

    const channelData = input[0]
    if (!channelData) {
      return true
    }

    for (let i = 0; i < channelData.length; i += 1) {
      this.buffer.push(channelData[i])
    }

    while (this.buffer.length >= this.frameSize) {
      const frame = this.buffer.slice(0, this.frameSize)
      this.buffer = this.buffer.slice(this.frameSize)
      if (this.enabled) {
        const pcm = new Float32Array(frame)
        this.port.postMessage({ type: "frame", pcm }, [pcm.buffer])
      }
    }

    return true
  }
}

registerProcessor("voice-capture-processor", VoiceCaptureProcessor)
