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
  user_id?: number
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

function decodeUserIdFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    const sub = payload?.sub
    const parsed = sub != null ? Number(sub) : NaN
    return Number.isFinite(parsed) ? parsed : null
  } catch {
    return null
  }
}

export default function VoiceChannelPanel({ channelId, orgId }: VoiceChannelPanelProps) {
  const clientIdRef = useRef<string>(createClientId())
  const currentUserIdRef = useRef<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const peerLevelIntervalRef = useRef<number | null>(null)

  const [isJoining, setIsJoining] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
  const [peerUserIds, setPeerUserIds] = useState<Map<string, number>>(new Map())
  const [peerLevels, setPeerLevels] = useState<Map<string, number>>(new Map())
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

    const payload: SignalMessage =
      currentUserIdRef.current != null && message.user_id == null
        ? { ...message, user_id: currentUserIdRef.current }
        : message

    ws.send(JSON.stringify(payload))
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

  const stopLevelPolling = useCallback(() => {
    if (peerLevelIntervalRef.current !== null) {
      window.clearInterval(peerLevelIntervalRef.current)
      peerLevelIntervalRef.current = null
    }
  }, [])

  const startLevelPolling = useCallback(() => {
    if (peerLevelIntervalRef.current !== null) {
      return
    }

    peerLevelIntervalRef.current = window.setInterval(() => {
      const peers = peerConnectionsRef.current

      const remoteLevels = new Map<string, number>()
      for (const [peerId, pc] of peers) {
        let maxLevel = 0
        for (const receiver of pc.getReceivers()) {
          if (receiver.track?.kind !== "audio") continue

          const getSources = (receiver as RTCRtpReceiver & {
            getSynchronizationSources?: () => Array<{ audioLevel?: number }>
          }).getSynchronizationSources
          if (!getSources) continue

          for (const src of getSources.call(receiver)) {
            const level = src.audioLevel ?? 0
            if (level > maxLevel) maxLevel = level
          }
        }
        remoteLevels.set(peerId, Math.min(1, maxLevel))
      }
      setPeerLevels(remoteLevels)

      const firstPc = peers.values().next().value as RTCPeerConnection | undefined
      if (firstPc) {
        firstPc
          .getStats()
          .then((stats) => {
            let level = 0
            stats.forEach((report) => {
              const r = report as { type?: string; kind?: string; audioLevel?: number }
              if (r.type === "media-source" && r.kind === "audio" && typeof r.audioLevel === "number") {
                if (r.audioLevel > level) level = r.audioLevel
              }
            })
            setLocalVoiceLevel(Math.min(1, level))
          })
          .catch(() => {})
      } else {
        setLocalVoiceLevel(0)
      }
    }, 150)
  }, [])

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

    setPeerUserIds((prev) => {
      if (!prev.has(peerId)) {
        return prev
      }
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })

    setPeerLevels((prev) => {
      if (!prev.has(peerId)) {
        return prev
      }
      const next = new Map(prev)
      next.delete(peerId)
      return next
    })

    if (peerConnectionsRef.current.size === 0) {
      stopLevelPolling()
    }
  }, [stopLevelPolling])

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

        startLevelPolling()
      }

      pc.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          removePeer(peerId)
        }
      }

      peerConnectionsRef.current.set(peerId, pc)
      return pc
    },
    [removePeer, rtcConfig, sendSignal, startLevelPolling]
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

    stopLevelPolling()

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop()
      }
      localStreamRef.current = null
    }

    currentUserIdRef.current = null

    setRemoteStreams(new Map())
    setPeerUserIds(new Map())
    setPeerLevels(new Map())
    setLocalVoiceLevel(0)
    setIsJoined(false)
    setIsJoining(false)
    setIsMuted(false)
  }, [stopLevelPolling])

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

      currentUserIdRef.current = decodeUserIdFromToken(token)

      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      localStreamRef.current = localStream
      startLevelPolling()

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

        if (typeof message.user_id === "number") {
          const incomingUserId = message.user_id
          const peerId = message.from
          setPeerUserIds((prev) => {
            if (prev.get(peerId) === incomingUserId) {
              return prev
            }
            const next = new Map(prev)
            next.set(peerId, incomingUserId)
            return next
          })
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
  }, [channelId, cleanup, getOrCreatePeerConnection, handleAnswer, handleIce, handleOffer, isJoined, isJoining, orgId, removeParticipant, sendSignal, startLevelPolling, upsertParticipant])

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
  const localUserSpeaking = !isMuted && localVoiceLevel > 0.1
  const localLevelPercent = Math.round(localVoiceLevel * 100)
  const totalParticipants = voiceParticipants.length
  const SPEAKING_THRESHOLD = 0.1

  const participantsByUserId = useMemo(() => {
    const map = new Map<number, VoiceParticipant>()
    for (const participant of voiceParticipants) {
      map.set(participant.user_id, participant)
    }
    return map
  }, [voiceParticipants])

  const speakingUserIds = useMemo(() => {
    const set = new Set<number>()
    for (const [peerId, level] of peerLevels) {
      if (level <= SPEAKING_THRESHOLD) continue
      const userId = peerUserIds.get(peerId)
      if (userId != null) set.add(userId)
    }
    if (localUserSpeaking && currentUserIdRef.current != null) {
      set.add(currentUserIdRef.current)
    }
    return set
  }, [peerLevels, peerUserIds, localUserSpeaking])

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
            {voiceParticipants.map((participant) => {
              const isSpeaking = speakingUserIds.has(participant.user_id)
              const isSelf = currentUserIdRef.current === participant.user_id
              return (
                <div
                  key={participant.user_id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2 transition-all ${
                    isSpeaking ? "border-green-500/70 shadow-[0_0_0_1px_rgba(34,197,94,0.3)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        isSpeaking ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                      }`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium">
                        {participant.first_name} {participant.last_name}
                        {isSelf ? <span className="ml-1 text-xs text-muted-foreground">(you)</span> : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{participant.user_tag || "No tag"}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${isSpeaking ? "text-green-600" : "text-muted-foreground"}`}>
                    {isSpeaking ? "Speaking" : "In voice"}
                  </span>
                </div>
              )
            })}
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

        {streamEntries.map(([peerId, stream]) => {
          const userId = peerUserIds.get(peerId)
          const participant = userId != null ? participantsByUserId.get(userId) : undefined
          const level = peerLevels.get(peerId) ?? 0
          const isSpeaking = level > SPEAKING_THRESHOLD
          const levelPercent = Math.round(level * 100)
          const displayName = participant
            ? `${participant.first_name} ${participant.last_name}`.trim() || participant.user_tag || `Peer ${peerId.slice(0, 8)}`
            : `Peer ${peerId.slice(0, 8)}`

          return (
            <div
              key={peerId}
              className={`rounded-md border bg-background p-3 transition-all ${
                isSpeaking ? "border-green-500/70 shadow-[0_0_0_1px_rgba(34,197,94,0.3)]" : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      isSpeaking ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"
                    }`}
                    aria-hidden
                  />
                  <p className="text-sm font-medium">{displayName}</p>
                </div>
                <span className={`text-xs font-medium ${isSpeaking ? "text-green-600" : "text-muted-foreground"}`}>
                  {isSpeaking ? "Speaking" : "Listening"}
                </span>
              </div>

              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-[width] duration-75 ${isSpeaking ? "bg-green-500" : "bg-primary/60"}`}
                  style={{ width: `${Math.max(4, levelPercent)}%` }}
                />
              </div>

              <audio
                autoPlay
                playsInline
                ref={(node) => {
                  if (node && node.srcObject !== stream) {
                    node.srcObject = stream
                  }
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
