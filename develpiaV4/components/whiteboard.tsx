"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Pencil, Eraser, Trash2, Download, Undo, Redo, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"

interface Point {
  x: number
  y: number
}

interface Path {
  points: Point[]
  color: string
  width: number
}

const colors = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Purple", value: "#a855f7" },
]

interface WhiteboardProps {
  currentProject: any
  currentUser: any
}

export function Whiteboard({ currentProject, currentUser }: WhiteboardProps) {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [history, setHistory] = useState<Path[][]>([])
  const [historyStep, setHistoryStep] = useState(0)
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(3)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [cursorPreview, setCursorPreview] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  })
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!currentProject) return

    const loadWhiteboard = async () => {
      const { data, error } = await supabase
        .from("whiteboard_data")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("[v0] Error loading whiteboard:", error)
        return
      }

      if (data && data.paths) {
        setPaths(data.paths as Path[])
        setHistory([data.paths as Path[]])
        setHistoryStep(0)
      }
    }

    loadWhiteboard()
  }, [currentProject])

  useEffect(() => {
    if (!currentProject || !currentUser || paths.length === 0) return

    const timer = setTimeout(async () => {
      const { data: existing } = await supabase
        .from("whiteboard_data")
        .select("id")
        .eq("project_id", currentProject.id)
        .single()

      if (existing) {
        await supabase
          .from("whiteboard_data")
          .update({
            paths: paths,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
      } else {
        await supabase.from("whiteboard_data").insert({
          project_id: currentProject.id,
          user_id: currentUser.id,
          paths: paths,
        })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [paths, currentProject, currentUser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(panX + canvas.width / 2, panY + canvas.height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-canvas.width / 2, -canvas.height / 2)

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

    ctx.restore()
  }, [paths, zoom, panX, panY])

  useEffect(() => {
    if (!currentProject) return

    const channel = supabase
      .channel(`whiteboard:${currentProject.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "whiteboard_data",
          filter: `project_id=eq.${currentProject.id}`,
        },
        (payload) => {
          console.log("[v0] Whiteboard updated remotely")
          if (payload.new.paths) {
            setPaths(payload.new.paths as Path[])
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true)
          console.log("[v0] Whiteboard real-time connected")
        }
      })

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [currentProject, supabase])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    return {
      x: (x - panX - canvas.width / 2) / zoom + canvas.width / 2,
      y: (y - panY - canvas.height / 2) / zoom + canvas.height / 2,
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

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color
    ctx.lineWidth = tool === "eraser" ? brushSize * 3 : brushSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    if (currentPath.length > 0) {
      ctx.save()
      ctx.translate(panX + canvas.width / 2, panY + canvas.height / 2)
      ctx.scale(zoom, zoom)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)

      ctx.beginPath()
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()

      ctx.restore()
    }
  }

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      const newPath: Path = {
        points: currentPath,
        color: tool === "eraser" ? "#ffffff" : color,
        width: tool === "eraser" ? brushSize * 3 : brushSize,
      }

      const newPaths = [...paths, newPath]
      setPaths(newPaths)

      const newHistory = history.slice(0, historyStep + 1)
      newHistory.push(newPaths)
      setHistory(newHistory)
      setHistoryStep(newHistory.length - 1)
    }

    setIsDrawing(false)
    setCurrentPath([])
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(5, prev * delta)))
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(5, prev * 1.2))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev / 1.2))
  }

  const handleResetZoom = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const clearCanvas = () => {
    setPaths([])
    const newHistory = [...history, []]
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
  }

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1)
      setPaths(history[historyStep - 1])
    }
  }

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1)
      setPaths(history[historyStep + 1])
    }
  }

  const downloadCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `whiteboard-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    setCursorPreview({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      visible: true,
    })

    if (isDrawing) {
      draw(e)
    }
  }

  const handleMouseLeave = () => {
    setCursorPreview({ ...cursorPreview, visible: false })
    stopDrawing()
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to use the whiteboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-4 border-b bg-card p-4 overflow-x-auto">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={tool === "pen" ? "default" : "outline"}
            onClick={() => setTool("pen")}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            Pen
          </Button>
          <Button
            size="sm"
            variant={tool === "eraser" ? "default" : "outline"}
            onClick={() => setTool("eraser")}
            className="gap-2"
          >
            <Eraser className="h-4 w-4" />
            Eraser
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          {colors.map((c) => (
            <button
              key={c.value}
              className={cn(
                "h-8 w-8 rounded-md border-2 transition-all",
                color === c.value ? "scale-110 border-primary" : "border-transparent",
              )}
              style={{ backgroundColor: c.value }}
              onClick={() => {
                setColor(c.value)
                setTool("pen")
              }}
              title={c.name}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Size:</span>
          <Slider
            value={[brushSize]}
            onValueChange={(value) => setBrushSize(value[0])}
            min={1}
            max={20}
            step={1}
            className="w-32"
          />
          <span className="w-8 text-sm">{brushSize}</span>
        </div>

        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleResetZoom}>
            Reset
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={undo} disabled={historyStep === 0}>
            <Undo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={redo} disabled={historyStep === history.length - 1}>
            <Redo className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={clearCanvas}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={downloadCanvas}>
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn("h-2 w-2 rounded-full", isConnected ? "bg-green-500" : "bg-gray-400")} />
          {isConnected ? "Live" : "Offline"}
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden bg-muted/20 p-4" onWheel={handleWheel}>
        <Card className="h-full w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={handleMouseLeave}
          />

          {cursorPreview.visible && !isDrawing && (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-primary"
              style={{
                left: cursorPreview.x,
                top: cursorPreview.y,
                width: brushSize * zoom * 2,
                height: brushSize * zoom * 2,
                transform: "translate(-50%, -50%)",
                borderColor: tool === "eraser" ? "#ef4444" : color,
                opacity: 0.5,
              }}
            />
          )}
        </Card>
      </div>
    </div>
  )
}
