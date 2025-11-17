"use client"

import type React from "react"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Download,
  Trash2,
  MoreVertical,
  Search,
  Grid3x3,
  List,
} from "lucide-react"
import { format } from "date-fns"
import type { FileItem } from "@/lib/types"

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return FileImage
  if (type.startsWith("video/")) return FileVideo
  if (type.startsWith("audio/")) return FileAudio
  if (type.startsWith("text/") || type.includes("document")) return FileText
  return File
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

export function Files() {
  const { currentProject, files, addFile } = useApp()
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const projectFiles = files.filter((f) => f.projectId === currentProject?.id)
  const filteredFiles = projectFiles.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || !currentProject) return

    Array.from(uploadedFiles).forEach((file) => {
      const newFile: FileItem = {
        id: Date.now().toString() + Math.random(),
        projectId: currentProject.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
        uploadedBy: "User",
        uploadedAt: new Date(),
      }
      addFile(newFile)
    })

    e.target.value = ""
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to manage files</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-card p-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={viewMode === "grid" ? "default" : "outline"}
            onClick={() => setViewMode("grid")}
            className="h-9 w-9 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "outline"}
            onClick={() => setViewMode("list")}
            className="h-9 w-9 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <label htmlFor="file-upload">
          <Button className="gap-2" asChild>
            <span>
              <Upload className="h-4 w-4" />
              Upload Files
            </span>
          </Button>
        </label>
        <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Files Display */}
      <ScrollArea className="flex-1 p-6">
        {filteredFiles.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Upload className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No files yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">Upload files to share with your team</p>
              <label htmlFor="file-upload-empty">
                <Button className="gap-2" asChild>
                  <span>
                    <Upload className="h-4 w-4" />
                    Upload Files
                  </span>
                </Button>
              </label>
              <input id="file-upload-empty" type="file" multiple className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type)
              return (
                <Card key={file.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <h3 className="mb-1 truncate font-medium text-balance">{file.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{format(file.uploadedAt, "MMM d")}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {file.uploadedBy}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map((file) => {
              const Icon = getFileIcon(file.type)
              return (
                <Card key={file.id} className="group transition-shadow hover:shadow-sm">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-balance">{file.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>Uploaded by {file.uploadedBy}</span>
                        <span>•</span>
                        <span>{format(file.uploadedAt, "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
