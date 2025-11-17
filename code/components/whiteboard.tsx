"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Pencil, Eraser, Trash2, Download, Undo, Redo } from "lucide-react"
import { cn } from "@/lib/utils"

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

export function Whiteboard() {
  const { currentProject } = useApp()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentPath, setCurrentPath] = useState<Point[]>([])
  const [paths, setPaths] = useState<Path[]>([])
  const [history, setHistory] = useState<Path[][]>([])
  const [historyStep, setHistoryStep] = useState(0)
  const [tool, setTool] = useState<"pen" | "eraser">("pen")
  const [color, setColor] = useState("#000000")
  const [brushSize, setBrushSize] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Clear canvas
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Redraw all paths
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

    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color
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
        color: tool === "eraser" ? "#ffffff" : color,
        width: tool === "eraser" ? brushSize * 3 : brushSize,
      }

      const newPaths = [...paths, newPath]
      setPaths(newPaths)

      // Update history
      const newHistory = history.slice(0, historyStep + 1)
      newHistory.push(newPaths)
      setHistory(newHistory)
      setHistoryStep(newHistory.length - 1)
    }

    setIsDrawing(false)
    setCurrentPath([])
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
      <div className="flex items-center gap-4 border-b bg-card p-4">
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
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden bg-muted/20 p-4">
        <Card className="h-full w-full overflow-hidden">
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </Card>
      </div>
    </div>
  )
}
