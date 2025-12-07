"use client"

import type React from "react"
import { useState, useEffect } from "react"
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
import { createClient } from "@/lib/supabase/client"

interface FileItem {
  id: string
  project_id: string
  user_id: string
  name: string
  url: string
  file_type: string
  size: number
  uploaded_by: string
  uploaded_at: string
}

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

interface FilesProps {
  currentProject: any
  currentUser: any
}

export function Files({ currentProject, currentUser }: FilesProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")

  const filteredFiles = files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    if (!currentProject) return

    const fetchFiles = async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("uploaded_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching files:", error)
        return
      }

      setFiles(data || [])
    }

    fetchFiles()

    // Subscribe to file changes
    const subscription = supabase
      .channel(`files:${currentProject.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "files",
          filter: `project_id=eq.${currentProject.id}`,
        },
        () => {
          fetchFiles()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentProject])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || !currentProject || !currentUser) return

    Array.from(uploadedFiles).forEach(async (file) => {
      try {
        const filePath = `${currentProject.id}/${Date.now()}-${file.name}`
        console.log("[v0] Uploading file to storage:", filePath)

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          })

        if (uploadError) {
          console.error("[v0] Error uploading to storage:", uploadError)
          alert(`Failed to upload ${file.name}: ${uploadError.message}`)
          return
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("project-files").getPublicUrl(filePath)

        console.log("[v0] File uploaded, saving metadata:", publicUrl)

        // Save metadata to database
        const { error } = await supabase.from("files").insert({
          project_id: currentProject.id,
          user_id: currentUser.id,
          name: file.name,
          file_type: file.type,
          size: file.size,
          url: publicUrl,
          uploaded_by: currentUser.name || currentUser.email,
        })

        if (error) {
          console.error("[v0] Error saving file metadata:", error)
          return
        }

        // Log activity
        await supabase.from("activity_logs").insert({
          project_id: currentProject.id,
          user_id: currentUser.id,
          user_name: currentUser.name || currentUser.email,
          action: "uploaded file",
          resource_type: "file",
          resource_name: file.name,
        })

        console.log("[v0] File uploaded successfully:", file.name)
      } catch (error) {
        console.error("[v0] Upload error:", error)
        alert(`Failed to upload ${file.name}`)
      }
    })

    e.target.value = ""
  }

  const deleteFile = async (id: string) => {
    const file = files.find((f) => f.id === id)
    if (!file) return

    try {
      // Extract file path from URL
      const urlParts = file.url.split("/project-files/")
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split("?")[0]

        // Delete from storage
        const { error: storageError } = await supabase.storage.from("project-files").remove([filePath])

        if (storageError) {
          console.error("[v0] Error deleting from storage:", storageError)
        }
      }

      // Delete from database
      const { error } = await supabase.from("files").delete().eq("id", id)

      if (error) {
        console.error("[v0] Error deleting file:", error)
      } else {
        console.log("[v0] File deleted successfully")
      }
    } catch (error) {
      console.error("[v0] Delete error:", error)
    }
  }

  const downloadFile = (file: FileItem) => {
    const link = document.createElement("a")
    link.href = file.url
    link.download = file.name
    link.click()
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
              const Icon = getFileIcon(file.file_type)
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
                          <DropdownMenuItem onClick={() => downloadFile(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteFile(file.id)}>
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
                      <span>{format(new Date(file.uploaded_at), "MMM d")}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {file.uploaded_by}
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
              const Icon = getFileIcon(file.file_type)
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
                        <span>Uploaded by {file.uploaded_by}</span>
                        <span>•</span>
                        <span>{format(new Date(file.uploaded_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => downloadFile(file)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteFile(file.id)}>
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
