"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, Mic, MicOff } from "lucide-react"
import { toast } from "sonner"
import { getAccessToken } from "@/lib/auth"

type VoiceParticipant = {
  user_id: number
  first_name: string
  last_name: string
  avatar_url?: string | null
  user_tag?: string
}

type SignalMessage = {
  type: "join" | "offer" | "answer" | "ice"
  from: string
  to?: string
  sdp?: RTCSessionDescriptionInit
  candidate?: RTCIceCandidateInit
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

type VoiceSocketMessage = SignalMessage | VoiceParticipantsMessage | VoiceJoinedMessage | VoiceLeftMessage

type VoiceChannelPanelProps = {
  channelId: number
  orgId: number
}

function buildVoiceWsUrl(channelId: number, orgId: number, token: string): string {
  const wsBaseUrl = `${process.env.NEXT_PUBLIC_WS_URL}`
  const authValue = encodeURIComponent(`Bearer ${token}`)
  return `${wsBaseUrl}/voice/${channelId}?authorization=${authValue}&org_id=${orgId}`
}

function createClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function VoiceChannelPanel({ channelId, orgId }: VoiceChannelPanelProps) {
  const clientIdRef = useRef<string>(createClientId())
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const meterRafRef = useRef<number | null>(null)

  const [isJoining, setIsJoining] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [localVoiceLevel, setLocalVoiceLevel] = useState(0)
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([])
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true)

  const rtcConfig = useMemo<RTCConfiguration>(
    () => ({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    }),
    []
  )

  const sendSignal = useCallback((message: SignalMessage) => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return
    }

    ws.send(JSON.stringify(message))
  }, [])

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

  const removePeer = useCallback((peerId: string) => {
    const pc = peerConnectionsRef.current.get(peerId)
    if (!pc) {
      return
    }

    pc.onicecandidate = null
    pc.ontrack = null
    pc.onconnectionstatechange = null
    pc.close()
    peerConnectionsRef.current.delete(peerId)

    setRemoteStreams((prev) => {
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })
  }, [])

  const getOrCreatePeerConnection = useCallback(
    (peerId: string) => {
      const existing = peerConnectionsRef.current.get(peerId)
      if (existing) {
        return existing
      }

      const pc = new RTCPeerConnection(rtcConfig)
      const localStream = localStreamRef.current

      if (localStream) {
        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream)
        }
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          return
        }

        sendSignal({
          type: "ice",
          from: clientIdRef.current,
          to: peerId,
          candidate: event.candidate.toJSON(),
        })
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams
        if (!stream) {
          return
        }

        setRemoteStreams((prev) => {
          const next = new Map(prev)
          next.set(peerId, stream)
          return next
        })
      }

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          removePeer(peerId)
        }
      }

      peerConnectionsRef.current.set(peerId, pc)
      return pc
    },
    [removePeer, rtcConfig, sendSignal]
  )

  const handleOffer = useCallback(
    async (message: SignalMessage) => {
      if (!message.sdp) {
        return
      }

      const peerId = message.from
      const pc = getOrCreatePeerConnection(peerId)

      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      sendSignal({
        type: "answer",
        from: clientIdRef.current,
        to: peerId,
        sdp: pc.localDescription || undefined,
      })
    },
    [getOrCreatePeerConnection, sendSignal]
  )

  const handleAnswer = useCallback(
    async (message: SignalMessage) => {
      if (!message.sdp) {
        return
      }

      const pc = peerConnectionsRef.current.get(message.from)
      if (!pc) {
        return
      }

      await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
    },
    []
  )

  const handleIce = useCallback(async (message: SignalMessage) => {
    if (!message.candidate) {
      return
    }

    const pc = peerConnectionsRef.current.get(message.from)
    if (!pc) {
      return
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
    } catch (error) {
      console.error("Failed to add ICE candidate", error)
    }
  }, [])

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

    const audioContext = new AudioContext()
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
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    for (const [, pc] of peerConnectionsRef.current) {
      pc.onicecandidate = null
      pc.ontrack = null
      pc.onconnectionstatechange = null
      pc.close()
    }
    peerConnectionsRef.current.clear()

    stopLocalMeter()

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop()
      }
      localStreamRef.current = null
    }

    setRemoteStreams(new Map())
    setIsJoined(false)
    setIsJoining(false)
    setIsMuted(false)
  }, [stopLocalMeter])

  const toggleMute = useCallback(() => {
    const localStream = localStreamRef.current
    if (!localStream) {
      return
    }

    const nextMuted = !isMuted
    for (const track of localStream.getAudioTracks()) {
      track.enabled = !nextMuted
    }
    setIsMuted(nextMuted)
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

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = localStream
      startLocalMeter(localStream)

      const ws = new WebSocket(buildVoiceWsUrl(channelId, orgId, token))

      ws.onmessage = async (event) => {
        let message: VoiceSocketMessage

        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }

        if (message.type === "voice_participants") {
          setVoiceParticipants(Array.isArray(message.participants) ? message.participants : [])
          return
        }

        if (message.type === "voice_joined") {
          if (message.participant) {
            upsertParticipant(message.participant)
          }
          return
        }

        if (message.type === "voice_left") {
          if (message.participant) {
            removeParticipant(message.participant)
          }
          return
        }

        if (!message || message.from === clientIdRef.current) {
          return
        }

        if (message.to && message.to !== clientIdRef.current) {
          return
        }

        switch (message.type) {
          case "join": {
            const peerId = message.from
            const pc = getOrCreatePeerConnection(peerId)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            sendSignal({
              type: "offer",
              from: clientIdRef.current,
              to: peerId,
              sdp: pc.localDescription || undefined,
            })
            break
          }
          case "offer":
            await handleOffer(message)
            break
          case "answer":
            await handleAnswer(message)
            break
          case "ice":
            await handleIce(message)
            break
          default:
            break
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

      sendSignal({
        type: "join",
        from: clientIdRef.current,
      })

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
  }, [channelId, cleanup, getOrCreatePeerConnection, handleAnswer, handleIce, handleOffer, isJoined, isJoining, orgId, removeParticipant, sendSignal, upsertParticipant])

  const leaveVoice = useCallback(() => {
    cleanup()
    toast("Left voice channel")
  }, [cleanup])

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

  const streamEntries = Array.from(remoteStreams.entries())
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
              Audio is peer-to-peer. TeamNest only forwards signaling messages.
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

        {isJoined && streamEntries.length === 0 && (
          <p className="text-sm text-muted-foreground">Connected to voice, waiting for remote audio streams.</p>
        )}

        {streamEntries.map(([peerId, stream]) => (
          <div key={peerId} className="rounded-md border bg-background p-3">
            <p className="mb-2 text-xs text-muted-foreground">Peer {peerId.slice(0, 8)}</p>
            <audio
              autoPlay
              controls
              ref={(node) => {
                if (node) {
                  node.srcObject = stream
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
