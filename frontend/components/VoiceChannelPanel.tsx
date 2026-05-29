"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mic, MicOff } from "lucide-react"
import { toast } from "sonner"
import { getAccessToken } from "@/lib/auth"
import { buildVoicePacket, parseVoicePacket } from "@/lib/voice/voicePacket"
import { JitterBuffer } from "@/lib/voice/jitterBuffer"

type VoiceParticipant = {
  user_id: number
  first_name: string
  last_name: string
  avatar_url?: string | null
  user_tag?: string
}

type VoiceParticipantsMessage = {
  type: "voice_participants"
  participants: VoiceParticipant[]
}

type VoiceJoinedMessage = {
  type: "voice_joined"
  participant: VoiceParticipant
}

type VoiceLeftMessage = {
  type: "voice_left"
  participant: VoiceParticipant
}

type VoiceSocketMessage = VoiceParticipantsMessage | VoiceJoinedMessage | VoiceLeftMessage

type VoiceChannelPanelProps = {
  channelId: number
  orgId: number
}

function buildVoiceWsUrl(channelId: number, orgId: number, token: string): string {
  const wsBaseUrl = `${process.env.NEXT_PUBLIC_WS_URL}`
  const authValue = encodeURIComponent(`Bearer ${token}`)
  return `${wsBaseUrl}/voice/${channelId}?authorization=${authValue}&org_id=${orgId}`
}

export default function VoiceChannelPanel({ channelId, orgId }: VoiceChannelPanelProps) {
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterRafRef = useRef<number | null>(null)
  const captureNodeRef = useRef<AudioWorkletNode | null>(null)
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const jitterBufferRef = useRef(new JitterBuffer<Uint8Array>(4))
  const decodeIntervalRef = useRef<number | null>(null)
  const mutedRef = useRef(false)

  const [isJoining, setIsJoining] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [localVoiceLevel, setLocalVoiceLevel] = useState(0)
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true)

  const SAMPLE_RATE = 48000
  const FRAME_MS = 20
  const FRAME_SAMPLES = (SAMPLE_RATE * FRAME_MS) / 1000

  const upsertParticipant = useCallback((participant: VoiceParticipant) => {
    setVoiceParticipants((prev) => {
      const next = prev.filter((entry) => entry.user_id !== participant.user_id)
      next.push(participant)
      return next
    })
  }, [])

  const removeParticipant = useCallback((participant: VoiceParticipant) => {
    setVoiceParticipants((prev) => prev.filter((entry) => entry.user_id !== participant.user_id))
  }, [])

  const fetchParticipants = useCallback(async () => {
    setIsLoadingParticipants(true)

    try {
      const token = getAccessToken()
      if (!token) {
        setVoiceParticipants([])
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/voice/${channelId}/participants?org_id=${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        setVoiceParticipants([])
        return
      }

      const data = await response.json()
      setVoiceParticipants(Array.isArray(data?.participants) ? data.participants : [])
    } catch {
      setVoiceParticipants([])
    } finally {
      setIsLoadingParticipants(false)
    }
  }, [channelId, orgId])

  const stopLocalMeter = useCallback(() => {
    if (meterRafRef.current !== null) {
      cancelAnimationFrame(meterRafRef.current)
      meterRafRef.current = null
    }

    analyserRef.current = null

    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }

    setLocalVoiceLevel(0)
  }, [])

  const startLocalMeter = useCallback((stream: MediaStream) => {
    stopLocalMeter()

    const audioContext = new AudioContext({ latencyHint: "interactive" })
    const source = audioContext.createMediaStreamSource(stream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.8

    source.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser

    const buffer = new Uint8Array(analyser.frequencyBinCount)

    const updateLevel = () => {
      const currentAnalyser = analyserRef.current
      if (!currentAnalyser) {
        return
      }

      currentAnalyser.getByteTimeDomainData(buffer)

      let sumSquares = 0
      for (let i = 0; i < buffer.length; i += 1) {
        const normalizedSample = (buffer[i] - 128) / 128
        sumSquares += normalizedSample * normalizedSample
      }

      const rms = Math.sqrt(sumSquares / buffer.length)
      const scaledLevel = Math.min(1, rms * 6)
      setLocalVoiceLevel(scaledLevel)

      meterRafRef.current = requestAnimationFrame(updateLevel)
    }

    meterRafRef.current = requestAnimationFrame(updateLevel)
  }, [stopLocalMeter])

  const cleanup = useCallback(() => {
    if (decodeIntervalRef.current !== null) {
      window.clearInterval(decodeIntervalRef.current)
      decodeIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    if (captureNodeRef.current) {
      captureNodeRef.current.disconnect()
      captureNodeRef.current = null
    }

    if (playbackNodeRef.current) {
      playbackNodeRef.current.disconnect()
      playbackNodeRef.current = null
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }

    stopLocalMeter()

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop()
      }
      localStreamRef.current = null
    }

    jitterBufferRef.current.clear()
    setIsJoined(false)
    setIsJoining(false)
    setIsMuted(false)
  }, [stopLocalMeter])

  const toggleMute = useCallback(() => {
    const nextMuted = !isMuted
    mutedRef.current = nextMuted
    setIsMuted(nextMuted)

    if (captureNodeRef.current) {
      captureNodeRef.current.port.postMessage({
        type: "configure",
        enabled: !nextMuted,
      })
    }
  }, [isMuted])

  const joinVoice = useCallback(async () => {
    if (isJoining || isJoined) {
      return
    }

    setIsJoining(true)

    try {
      const token = getAccessToken()
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in first",
        })
        setIsJoining(false)
        return
      }

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      })
      localStreamRef.current = localStream
      startLocalMeter(localStream)

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE, latencyHint: "interactive" })
      audioContextRef.current = audioContext
      await audioContext.resume()

      await audioContext.audioWorklet.addModule("/voice/voice-capture-worklet.js")
      await audioContext.audioWorklet.addModule("/voice/voice-playback-worklet.js")

      const source = audioContext.createMediaStreamSource(localStream)
      const captureNode = new AudioWorkletNode(audioContext, "voice-capture-processor")
      captureNode.port.postMessage({ type: "configure", frameSize: FRAME_SAMPLES, enabled: true })
      captureNodeRef.current = captureNode
      source.connect(captureNode)

      const playbackNode = new AudioWorkletNode(audioContext, "voice-playback-processor")
      playbackNode.connect(audioContext.destination)
      playbackNodeRef.current = playbackNode

      const worker = new Worker(new URL("../workers/voice-opus-worker.ts", import.meta.url), {
        type: "module",
      })
      workerRef.current = worker

      worker.postMessage({ type: "init", sampleRate: SAMPLE_RATE, channels: 1 })

      worker.onmessage = (event) => {
        const data = event.data
        if (data.type === "error") {
          toast.error("Voice encoder error", { description: data.message })
          return
        }

        if (data.type === "opus") {
          const packet = buildVoicePacket(data.seq, Date.now(), data.packet)
          const ws = wsRef.current
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(packet)
          }
          return
        }

        if (data.type === "pcm") {
          playbackNode.port.postMessage({ type: "pcm", pcm: data.pcm }, [data.pcm.buffer])
        }
      }

      captureNode.port.onmessage = (event) => {
        const data = event.data
        if (data?.type === "frame") {
          if (!mutedRef.current) {
            worker.postMessage({ type: "encode", pcm: data.pcm }, [data.pcm.buffer])
          }
        }
      }

      const ws = new WebSocket(buildVoiceWsUrl(channelId, orgId, token))
      ws.binaryType = "arraybuffer"

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          let message: VoiceSocketMessage
          try {
            message = JSON.parse(event.data)
          } catch {
            return
          }

          if (message.type === "voice_participants") {
            setVoiceParticipants(Array.isArray(message.participants) ? message.participants : [])
          } else if (message.type === "voice_joined") {
            if (message.participant) {
              upsertParticipant(message.participant)
            }
          } else if (message.type === "voice_left") {
            if (message.participant) {
              removeParticipant(message.participant)
            }
          }
          return
        }

        if (event.data instanceof ArrayBuffer) {
          const packet = parseVoicePacket(event.data)
          if (!packet) {
            return
          }
          jitterBufferRef.current.insert(packet.seq, packet.payload)
        }
      }

      ws.onclose = () => {
        setIsJoined(false)
      }

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve()
        ws.onerror = () => reject(new Error("Voice websocket connection failed"))
      })

      wsRef.current = ws
      setIsJoined(true)

      decodeIntervalRef.current = window.setInterval(() => {
        const payload = jitterBufferRef.current.pop()
        if (payload) {
          worker.postMessage({ type: "decode", packet: payload }, [payload.buffer])
        }
      }, FRAME_MS)

      toast.success("Voice connected", {
        description: "Microphone is active",
      })
    } catch (error) {
      console.error("Failed to join voice", error)
      toast.error("Voice connection failed", {
        description: "Please allow microphone access and try again",
      })
      cleanup()
    } finally {
      setIsJoining(false)
    }
  }, [channelId, cleanup, isJoined, isJoining, orgId, removeParticipant, upsertParticipant])

  const leaveVoice = useCallback(() => {
    cleanup()
    toast("Left voice channel")
  }, [cleanup])

  useEffect(() => {
    mutedRef.current = isMuted
  }, [isMuted])

  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  useEffect(() => {
    void fetchParticipants()

    const intervalId = window.setInterval(() => {
      void fetchParticipants()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchParticipants])

  const localUserSpeaking = localVoiceLevel > 0.1
  const localLevelPercent = Math.round(localVoiceLevel * 100)
  const totalParticipants = voiceParticipants.length

  return (
    <div className="max-w-5xl mx-auto w-full space-y-4 p-6">
      <div className="rounded-xl border bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Voice Channel</h3>
            <p className="text-sm text-muted-foreground">
              Audio is relayed over WebSockets with Opus frames and a jitter buffer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isJoined ? (
              <Button onClick={joinVoice} disabled={isJoining}>
                {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mic className="mr-2 h-4 w-4" />}
                {isJoining ? "Joining..." : "Join Voice"}
              </Button>
            ) : (
              <>
                <Button variant={isMuted ? "secondary" : "outline"} onClick={toggleMute}>
                  {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isMuted ? "Unmute" : "Mute"}
                </Button>
                <Button variant="destructive" onClick={leaveVoice}>
                  <MicOff className="mr-2 h-4 w-4" />
                  Leave Voice
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Participants in Voice: {totalParticipants}</p>

        {isLoadingParticipants && (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading participants...
          </div>
        )}

        {!isLoadingParticipants && voiceParticipants.length > 0 && (
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border bg-background p-3">
            {voiceParticipants.map((participant) => (
              <div key={participant.user_id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    {participant.first_name} {participant.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground">{participant.user_tag || "No tag"}</p>
                </div>
                <span className="text-xs text-green-600">In voice</span>
              </div>
            ))}
          </div>
        )}

        {!isLoadingParticipants && voiceParticipants.length === 0 && (
          <p className="text-sm text-muted-foreground">No one is in this voice channel yet.</p>
        )}

        {isJoined && (
          <div
            className={`rounded-md border bg-background p-3 transition-all ${
              localUserSpeaking ? "border-green-500/70 shadow-[0_0_0_1px_rgba(34,197,94,0.3)]" : ""
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">You</p>
              <span className={`text-xs font-medium ${localUserSpeaking ? "text-green-600" : "text-muted-foreground"}`}>
                {isMuted ? "Muted" : localUserSpeaking ? "Speaking" : "Listening"}
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-[width] duration-75 ${localUserSpeaking ? "bg-green-500" : "bg-primary/60"}`}
                style={{ width: `${Math.max(4, localLevelPercent)}%` }}
              />
            </div>
          </div>
        )}

        {isJoined && (
          <p className="text-sm text-muted-foreground">
            Connected to voice. Playback uses a jitter buffer for stable audio.
          </p>
        )}
      </div>
    </div>
  )
}
