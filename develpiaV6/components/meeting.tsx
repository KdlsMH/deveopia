"use client"

import type React from "react"
import type { KeyboardEvent } from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  PhoneCall,
  Users,
  MessageSquare,
  Send,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { useProject } from "@/lib/project-context"

interface Point {
  x: number
  y: number
}

interface Path {
  points: Point[]
  color: string
  width: number
}

interface ChatMessage {
  id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

interface Participant {
  user_id: string
  user_name: string
  status: string
  last_seen: string
  isVideoOn?: boolean
  stream?: MediaStream
}

interface PeerConnection {
  connection: RTCPeerConnection
  stream?: MediaStream
}

const colors = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"]

export function Meeting({ currentProjectId }: { currentProjectId: string | null }) {
  const [isMicOn, setIsMicOn] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, PeerConnection>>(new Map())
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

  const { currentUser, currentProject } = useProject()
  const [activeTab, setActiveTab] = useState("chat")
  const [hasJoined, setHasJoined] = useState(false)
  const [isScreenShareAvailable, setIsScreenShareAvailable] = useState(false)
  const [paths, setPaths] = useState<Path[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [tool, setTool] = useState("pen")
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(5)

  useEffect(() => {
    if (!currentProject || !currentUser || !hasJoined) return

    console.log("[v0] Meeting initializing for project:", currentProject.name)

    const loadParticipants = async () => {
      const { data, error } = await supabase
        .from("user_presence")
        .select(`
          user_id,
          status,
          last_seen,
          users!inner(name, email)
        `)
        .eq("project_id", currentProject.id)
        .eq("current_view", "meeting")

      if (error) {
        console.error("[v0] Error loading participants:", error)
        return
      }

      if (data) {
        console.log("[v0] Meeting participants loaded:", data.length)
        setParticipants(
          data.map((p: any) => ({
            user_id: p.user_id,
            user_name: p.users?.name || p.users?.email || "Unknown",
            status: p.status,
            last_seen: p.last_seen,
          })),
        )
      }
    }

    loadParticipants()

    const presenceChannel = supabase
      .channel(`presence:${currentProject.id}:meeting`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `project_id=eq.${currentProject.id}`,
        },
        () => {
          console.log("[v0] Presence changed, reloading participants")
          loadParticipants()
        },
      )
      .subscribe()

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [currentProject, currentUser, hasJoined])

  useEffect(() => {
    if (!currentProject || !currentUser || !hasJoined) return

    const signalingChannel = supabase.channel(`meeting:${currentProject.id}`)

    signalingChannel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.to === currentUser.id) {
          await handleOffer(payload.from, payload.offer)
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.to === currentUser.id) {
          await handleAnswer(payload.from, payload.answer)
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        if (payload.to === currentUser.id) {
          await handleIceCandidate(payload.from, payload.candidate)
        }
      })
      .subscribe()

    return () => {
      signalingChannel.unsubscribe()
    }
  }, [currentProject, currentUser, hasJoined])

  const handleJoinMeeting = async () => {
    if (!currentProject || !currentUser) return

    setHasJoined(true)
    setIsMicOn(true)
    setIsVideoOn(false)

    await initializeWebRTC(false, true)

    const { error } = await supabase.from("user_presence").upsert(
      {
        user_id: currentUser.id,
        project_id: currentProject.id,
        status: "online",
        current_view: "meeting",
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (error) {
      console.error("[v0] Error updating presence:", error)
    } else {
      console.log("[v0] Joined meeting, presence updated")
    }
  }

  const handleLeaveMeeting = async () => {
    peerConnections.forEach((peerConn) => {
      peerConn.connection.close()
    })
    setPeerConnections(new Map())

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop())
      setScreenStream(null)
    }

    setHasJoined(false)
    setIsMicOn(false)
    setIsVideoOn(false)
    setIsScreenSharing(false)

    if (currentUser && currentProject) {
      await supabase
        .from("user_presence")
        .update({
          current_view: "chat",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", currentUser.id)

      console.log("[v0] Left meeting, presence updated")
    }
  }

  const initializeWebRTC = async (video: boolean, audio: boolean) => {
    try {
      if (!video && !audio) {
        if (localStream) {
          localStream.getTracks().forEach((track) => track.stop())
          setLocalStream(null)
        }
        return
      }

      console.log("[v0] Initializing WebRTC - video:", video, "audio:", audio)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: audio,
      })

      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
        localVideoRef.current.play().catch((e) => console.log("[v0] Video autoplay:", e))
      }

      console.log("[v0] WebRTC initialized successfully")
    } catch (error) {
      console.error("[v0] Error starting WebRTC:", error)
    }
  }

  const toggleVideo = async () => {
    const newVideoState = !isVideoOn
    setIsVideoOn(newVideoState)

    if (newVideoState) {
      await initializeWebRTC(true, isMicOn)
    } else {
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.stop()
          localStream.removeTrack(videoTrack)
        }
        if (!isMicOn) {
          setLocalStream(null)
        }
      }
    }
  }

  const toggleMic = async () => {
    const newMicState = !isMicOn
    setIsMicOn(newMicState)

    if (newMicState) {
      await initializeWebRTC(isVideoOn, true)
    } else {
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.stop()
          localStream.removeTrack(audioTrack)
        }
        if (!isVideoOn) {
          setLocalStream(null)
        }
      }
    }
  }

  const handleScreenShare = async () => {
    if (!isScreenShareAvailable) return

    try {
      if (isScreenSharing) {
        if (screenStream) {
          screenStream.getTracks().forEach((track) => track.stop())
          setScreenStream(null)
        }
        setIsScreenSharing(false)
        console.log("[v0] Screen share stopped")
      } else {
        console.log("[v0] Starting screen share...")

        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor",
          } as any,
          audio: false,
        })

        console.log("[v0] Screen share stream obtained:", displayStream.getVideoTracks()[0].getSettings())

        setScreenStream(displayStream)
        setIsScreenSharing(true)

        setTimeout(() => {
          if (screenVideoRef.current && displayStream) {
            console.log("[v0] Attaching stream to video element")
            screenVideoRef.current.srcObject = displayStream
            screenVideoRef.current
              .play()
              .then(() => {
                console.log("[v0] Screen share video playing successfully")
              })
              .catch((e) => {
                console.error("[v0] Screen share play error:", e)
              })
          }
        }, 100)

        displayStream.getVideoTracks()[0].onended = () => {
          console.log("[v0] Screen share ended by user")
          setIsScreenSharing(false)
          setScreenStream(null)
        }
      }
    } catch (error: any) {
      console.error("[v0] Error with screen sharing:", error.message)
      if (error.name === "NotAllowedError") {
        alert("Screen sharing permission denied. Please allow screen sharing to continue.")
      }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.fillStyle = "rgba(0, 0, 0, 0.02)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    paths.forEach((path) => {
      if (path.points.length < 2) return

      ctx.strokeStyle = path.color
      ctx.lineWidth = path.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)

      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y)
      }

      ctx.stroke()
    })
  }, [paths])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const point = getCoordinates(e)
    setCurrentPath([point])
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const point = getCoordinates(e)
    const newPath = [...currentPath, point]
    setCurrentPath(newPath)

    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return

    ctx.strokeStyle = tool === "eraser" ? "rgba(0, 0, 0, 0.02)" : color
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (currentPath.length > 0) {
      ctx.beginPath()
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      const newPath: Path = {
        points: currentPath,
        color: tool === "eraser" ? "rgba(0, 0, 0, 0.02)" : color,
        width: tool === "eraser" ? brushSize * 3 : brushSize,
      }

      setPaths([...paths, newPath])
    }

    setIsDrawing(false)
    setCurrentPath([])
  }

  const clearCanvas = () => {
    setPaths([])
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentProject || !currentUser) return

    const { error } = await supabase.from("messages").insert({
      project_id: currentProject.id,
      channel_id: null,
      user_id: currentUser.id,
      user_name: currentUser.name || currentUser.email,
      content: messageInput,
      type: "meeting",
    })

    if (!error) {
      setMessageInput("")
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage()
    }
  }

  useEffect(() => {
    const checkScreenShareSupport = () => {
      try {
        const isAvailable =
          navigator.mediaDevices &&
          typeof navigator.mediaDevices.getDisplayMedia === "function" &&
          window.self === window.top
        setIsScreenShareAvailable(!!isAvailable)
      } catch (error) {
        setIsScreenShareAvailable(false)
      }
    }
    checkScreenShareSupport()
  }, [])

  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const createPeerConnection = async (userId: string): Promise<RTCPeerConnection> => {
    const configuration: RTCConfiguration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    }

    const pc = new RTCPeerConnection(configuration)

    // Add local stream tracks to peer connection
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream)
      })
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log("[v0] Received remote stream from:", userId)
      const remoteStream = event.streams[0]

      setParticipants((prev) => prev.map((p) => (p.user_id === userId ? { ...p, stream: remoteStream } : p)))
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && currentProject && currentUser) {
        supabase.channel(`meeting:${currentProject.id}`).send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            from: currentUser.id,
            to: userId,
            candidate: event.candidate,
          },
        })
      }
    }

    setPeerConnections((prev) => {
      const newMap = new Map(prev)
      newMap.set(userId, { connection: pc })
      return newMap
    })

    return pc
  }

  const handleOffer = async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
    console.log("[v0] Received offer from:", fromUserId)
    const pc = await createPeerConnection(fromUserId)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    if (currentProject && currentUser) {
      supabase.channel(`meeting:${currentProject.id}`).send({
        type: "broadcast",
        event: "answer",
        payload: {
          from: currentUser.id,
          to: fromUserId,
          answer: answer,
        },
      })
    }
  }

  const handleAnswer = async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
    console.log("[v0] Received answer from:", fromUserId)
    const peerConn = peerConnections.get(fromUserId)
    if (peerConn) {
      await peerConn.connection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  const handleIceCandidate = async (fromUserId: string, candidate: RTCIceCandidateInit) => {
    const peerConn = peerConnections.get(fromUserId)
    if (peerConn) {
      await peerConn.connection.addIceCandidate(new RTCIceCandidate(candidate))
    }
  }

  const initiateConnection = async (userId: string) => {
    if (userId === currentUser?.id) return
    if (peerConnections.has(userId)) return

    console.log("[v0] Initiating connection with:", userId)
    const pc = await createPeerConnection(userId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    if (currentProject && currentUser) {
      supabase.channel(`meeting:${currentProject.id}`).send({
        type: "broadcast",
        event: "offer",
        payload: {
          from: currentUser.id,
          to: userId,
          offer: offer,
        },
      })
    }
  }

  useEffect(() => {
    if (!currentProject || !hasJoined) return

    const channel = supabase
      .channel(`presence:${currentProject.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        console.log("[v0] Presence change detected:", payload)
        loadParticipants()
      })
      .subscribe()

    loadParticipants()

    return () => {
      channel.unsubscribe()
    }
  }, [currentProject, hasJoined])

  const loadParticipants = async () => {
    if (!currentProject) return

    const { data, error } = await supabase
      .from("user_presence")
      .select("user_id, project_id, status, last_seen")
      .eq("project_id", currentProject.id)
      .eq("current_view", "meeting")

    if (error) {
      console.error("[v0] Error loading participants:", error)
      return
    }

    const participantList: Participant[] =
      data?.map((p: any) => ({
        user_id: p.user_id,
        user_name: p.user_id === currentUser?.id ? currentUser.name || "You" : "User",
        status: p.status,
        last_seen: p.last_seen,
      })) || []

    setParticipants(participantList)

    if (hasJoined && currentUser) {
      participantList.forEach((participant) => {
        if (participant.user_id !== currentUser.id && !peerConnections.has(participant.user_id)) {
          initiateConnection(participant.user_id)
        }
      })
    }

    console.log("[v0] Meeting participants loaded:", participantList.length)
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to start a meeting</p>
        </div>
      </div>
    )
  }

  if (!hasJoined) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <Card className="p-8 text-center max-w-md">
          <div className="mb-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <PhoneCall className="h-10 w-10 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Join Meeting</h3>
            <p className="text-sm text-muted-foreground">
              Join the meeting for <span className="font-medium text-foreground">{currentProject.name}</span>
            </p>
          </div>

          <div className="mb-6 flex justify-center gap-4">
            <Button
              size="lg"
              variant={isMicOn ? "default" : "outline"}
              onClick={() => setIsMicOn(!isMicOn)}
              className="gap-2"
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              {isMicOn ? "Mic On" : "Mic Off"}
            </Button>
            <Button
              size="lg"
              variant={isVideoOn ? "default" : "outline"}
              onClick={() => setIsVideoOn(!isVideoOn)}
              className="gap-2"
            >
              {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              {isVideoOn ? "Cam On" : "Cam Off"}
            </Button>
          </div>

          <Button size="lg" className="w-full gap-2" onClick={handleJoinMeeting}>
            <PhoneCall className="h-5 w-5" />
            Join Now
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="relative flex-1 bg-muted/20 overflow-hidden">
          {isScreenSharing && screenStream && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black">
              <video
                ref={screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
                style={{ backgroundColor: "#000" }}
              />
              <div className="absolute top-4 left-4 rounded-lg bg-red-500/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-white shadow-lg flex items-center gap-2 z-20">
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span>{currentUser?.name || "Someone"} is sharing screen</span>
              </div>
              {hasJoined && participants.length > 0 && (
                <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                  {participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className="relative h-24 w-24 rounded-lg overflow-hidden bg-muted border-2 border-white shadow-lg"
                    >
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{participant.user_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-2 py-1 text-xs text-white truncate">
                        {participant.user_name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isScreenSharing && (
            <div className="grid h-full w-full place-items-center p-4">
              {hasJoined && participants.length > 0 ? (
                <div
                  className="grid gap-4 w-full h-full"
                  style={{
                    gridTemplateColumns:
                      participants.length === 1
                        ? "1fr"
                        : participants.length === 2
                          ? "repeat(2, 1fr)"
                          : "repeat(3, 1fr)",
                  }}
                >
                  {participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className="relative flex items-center justify-center rounded-lg bg-muted/50 overflow-hidden aspect-video"
                    >
                      {participant.user_id === currentUser?.id ? (
                        isVideoOn && localStream ? (
                          <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Avatar className="h-24 w-24">
                            <AvatarFallback>{currentUser?.name?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                        )
                      ) : participant.stream ? (
                        <video
                          ref={(el) => {
                            if (el) {
                              remoteVideoRefs.current.set(participant.user_id, el)
                              el.srcObject = participant.stream
                              el.play().catch((e) => console.log("[v0] Remote video play error:", e))
                            }
                          }}
                          autoPlay
                          playsInline
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Avatar className="h-24 w-24">
                          <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                      )}
                      <div className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                        {participant.user_id === currentUser?.id ? "You" : participant.user_name}
                      </div>
                      {participant.user_id === currentUser?.id && !isMicOn && (
                        <div className="absolute top-2 right-2 rounded-full bg-red-500/90 p-1.5">
                          <MicOff className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {hasJoined ? "Waiting for participants..." : "Join the meeting to see participants"}
                  </p>
                </div>
              )}
            </div>
          )}

          {isScreenSharing && hasJoined && participants.length > 0 && (
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              {participants.map((participant) => (
                <div
                  key={participant.user_id}
                  className="relative flex items-center justify-center rounded-lg bg-muted/90 backdrop-blur-sm overflow-hidden w-32 h-20 border-2 border-white/20"
                >
                  {participant.user_id === currentUser?.id && isVideoOn && localStream ? (
                    <video
                      ref={participant.user_id === currentUser?.id ? localVideoRef : undefined}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {participant.user_id === currentUser?.id ? currentUser?.name?.[0] || "U" : "U"}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                    {participant.user_id === currentUser?.id ? "You" : "User"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 border-t bg-card p-4">
          <Button size="lg" variant={isMicOn ? "default" : "outline"} onClick={toggleMic} className="gap-2">
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button size="lg" variant={isVideoOn ? "default" : "outline"} onClick={toggleVideo} className="gap-2">
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button
            variant={isScreenSharing ? "default" : "outline"}
            size="lg"
            onClick={handleScreenShare}
            disabled={!isScreenShareAvailable}
            title={
              isScreenShareAvailable
                ? isScreenSharing
                  ? "Stop sharing"
                  : "Share screen"
                : "Screen sharing not available in preview"
            }
            className="gap-2"
          >
            {isScreenSharing ? <Monitor className="h-5 w-5" /> : <MonitorOff className="h-5 w-5" />}
          </Button>
          <Button size="lg" variant="destructive" className="gap-2" onClick={handleLeaveMeeting}>
            <Phone className="h-5 w-5" />
            Leave
          </Button>
        </div>
      </div>

      {/* Chat/Participants sidebar */}
      <div className="w-80 border-l bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-2">
              <Users className="h-4 w-4" />
              People ({participants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="space-y-3 p-4">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{message.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), "h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-pretty">{message.content}</p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="border-t p-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Send a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button size="icon" onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="participants" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div key={participant.user_id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {participant.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {participant.user_name}
                        {participant.user_id === currentUser?.id && " (You)"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">{participant.status}</p>
                    </div>
                    <div
                      className={cn(
                        "h-3 w-3 rounded-full ring-2",
                        participant.status === "online" ? "bg-green-500 ring-green-400" : "bg-gray-500 ring-gray-400",
                      )}
                      title={participant.status === "online" ? "Online" : "Offline"}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Meeting
