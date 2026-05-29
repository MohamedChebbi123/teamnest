class VoicePlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.bufferSeconds = 2
    this.capacity = Math.floor(sampleRate * this.bufferSeconds)
    this.ring = new Float32Array(this.capacity)
    this.writeIndex = 0
    this.readIndex = 0
    this.available = 0

    this.port.onmessage = (event) => {
      const data = event.data || {}
      if (data.type === "configure" && typeof data.bufferSeconds === "number") {
        this.bufferSeconds = Math.max(1, data.bufferSeconds)
        this.capacity = Math.floor(sampleRate * this.bufferSeconds)
        this.ring = new Float32Array(this.capacity)
        this.writeIndex = 0
        this.readIndex = 0
        this.available = 0
        return
      }

      if (data.type === "pcm" && data.pcm) {
        this.push(data.pcm)
      }
    }
  }

  push(pcm) {
    const samples = pcm.length
    if (samples === 0) {
      return
    }

    if (samples > this.capacity) {
      pcm = pcm.slice(samples - this.capacity)
    }

    for (let i = 0; i < pcm.length; i += 1) {
      if (this.available >= this.capacity) {
        this.readIndex = (this.readIndex + 1) % this.capacity
        this.available -= 1
      }

      this.ring[this.writeIndex] = pcm[i]
      this.writeIndex = (this.writeIndex + 1) % this.capacity
      this.available += 1
    }
  }

  process(inputs, outputs) {
    const output = outputs[0]
    if (!output || output.length === 0) {
      return true
    }

    const channel = output[0]
    for (let i = 0; i < channel.length; i += 1) {
      if (this.available > 0) {
        channel[i] = this.ring[this.readIndex]
        this.readIndex = (this.readIndex + 1) % this.capacity
        this.available -= 1
      } else {
        channel[i] = 0
      }
    }

    return true
  }
}

registerProcessor("voice-playback-processor", VoicePlaybackProcessor)
