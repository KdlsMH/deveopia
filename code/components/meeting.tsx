"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Slider } from "@/components/ui/slider"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  Users,
  MessageSquare,
  Pencil,
  Send,
  Eraser,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

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
  userName: string
  content: string
  timestamp: Date
}

const colors = ["#000000", "#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7"]

export function Meeting() {
  const { currentProject } = useApp()
  const [isMicOn, setIsMicOn] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [activeTab, setActiveTab] = useState("chat")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState("")

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [color, setColor] = useState("#ef4444")
  const [brushSize, setBrushSize] = useState(3)

  const participants = currentProject?.members || []

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

  const handleSendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userName: "User",
      content: messageInput,
      timestamp: new Date(),
    }

    setChatMessages([...chatMessages, newMessage])
    setMessageInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
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

  return (
    <div className="flex h-full">
      {/* Main Meeting Area */}
      <div className="flex flex-1 flex-col">
        {/* Video/Screen Share Area */}
        <div className="relative flex-1 bg-muted/20">
          <div className="absolute inset-0 flex items-center justify-center">
            {isScreenSharing ? (
              <div className="relative h-full w-full">
                <div className="flex h-full items-center justify-center bg-card">
                  <Monitor className="h-16 w-16 text-muted-foreground" />
                  <p className="ml-4 text-lg text-muted-foreground">Screen sharing active</p>
                </div>
                {/* Drawing overlay */}
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 h-full w-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            ) : (
              <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant, index) => (
                  <Card key={index} className="flex aspect-video items-center justify-center bg-card p-8">
                    <div className="text-center">
                      <Avatar className="mx-auto mb-2 h-16 w-16">
                        <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                          {participant.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{participant}</p>
                      <p className="text-xs text-muted-foreground">{index === 0 ? "Host" : "Participant"}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Drawing Tools (when screen sharing) */}
          {isScreenSharing && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-lg border bg-card p-2 shadow-lg">
              <Button
                size="sm"
                variant={tool === "pen" ? "default" : "outline"}
                onClick={() => setTool("pen")}
                className="h-8 w-8 p-0"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === "eraser" ? "default" : "outline"}
                onClick={() => setTool("eraser")}
                className="h-8 w-8 p-0"
              >
                <Eraser className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border" />
              {colors.map((c) => (
                <button
                  key={c}
                  className={cn(
                    "h-6 w-6 rounded border-2 transition-all",
                    color === c ? "scale-110 border-primary" : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c)
                    setTool("pen")
                  }}
                />
              ))}
              <div className="h-6 w-px bg-border" />
              <Slider
                value={[brushSize]}
                onValueChange={(value) => setBrushSize(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-20"
              />
              <Button size="sm" variant="outline" onClick={clearCanvas} className="h-8 w-8 p-0 bg-transparent">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 border-t bg-card p-4">
          <Button
            size="lg"
            variant={isMicOn ? "default" : "outline"}
            onClick={() => setIsMicOn(!isMicOn)}
            className="gap-2"
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button
            size="lg"
            variant={isVideoOn ? "default" : "outline"}
            onClick={() => setIsVideoOn(!isVideoOn)}
            className="gap-2"
          >
            {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button
            size="lg"
            variant={isScreenSharing ? "default" : "outline"}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className="gap-2"
          >
            {isScreenSharing ? <Monitor className="h-5 w-5" /> : <MonitorOff className="h-5 w-5" />}
          </Button>
          <Button size="lg" variant="destructive" className="gap-2">
            <Phone className="h-5 w-5" />
            Leave
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 border-l bg-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex h-full flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-2">
              <Users className="h-4 w-4" />
              People
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">{format(message.timestamp, "h:mm a")}</span>
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
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {participant.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{participant}</p>
                      <p className="text-xs text-muted-foreground">{index === 0 ? "Host" : "Participant"}</p>
                    </div>
                    <div className="flex gap-1">{index === 0 && <Mic className="h-4 w-4 text-muted-foreground" />}</div>
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
