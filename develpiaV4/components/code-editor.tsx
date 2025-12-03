"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Plus, X, FileCode, Terminal } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"

interface CodeFile {
  id: string
  project_id: string
  name: string
  language: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

const languages = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "json", label: "JSON" },
]

interface CodeEditorProps {
  currentProject: any
  currentUser: any
}

export function CodeEditor({ currentProject, currentUser }: CodeEditorProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<CodeFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [output, setOutput] = useState("")

  const activeFile = files.find((f) => f.id === activeFileId)

  useEffect(() => {
    if (!currentProject) return

    const fetchFiles = async () => {
      const { data, error } = await supabase
        .from("code_files")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("created_at")

      if (error) {
        console.error("[v0] Error fetching code files:", error)
        return
      }

      setFiles(data || [])
      if (data && data.length > 0 && !activeFileId) {
        setActiveFileId(data[0].id)
      }
    }

    fetchFiles()

    // Subscribe to code file changes
    const subscription = supabase
      .channel(`code_files:${currentProject.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "code_files",
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

  const handleCodeChange = async (content: string) => {
    if (!activeFileId) return

    setFiles(files.map((f) => (f.id === activeFileId ? { ...f, content } : f)))

    const { error } = await supabase
      .from("code_files")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", activeFileId)

    if (error) {
      console.error("[v0] Error updating code file:", error)
    }
  }

  const handleLanguageChange = async (language: string) => {
    if (!activeFileId) return

    setFiles(files.map((f) => (f.id === activeFileId ? { ...f, language } : f)))

    const { error } = await supabase
      .from("code_files")
      .update({ language, updated_at: new Date().toISOString() })
      .eq("id", activeFileId)

    if (error) {
      console.error("[v0] Error updating language:", error)
    }
  }

  const handleAddFile = async () => {
    if (!currentProject || !currentUser) return

    const { data, error } = await supabase
      .from("code_files")
      .insert({
        project_id: currentProject.id,
        name: `untitled-${files.length + 1}.js`,
        language: "javascript",
        content: "// Start coding...\n",
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating code file:", error)
      return
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      project_id: currentProject.id,
      user_id: currentUser.id,
      user_name: currentUser.name || currentUser.email,
      action: "created file",
      resource_type: "code_file",
      resource_name: data.name,
    })

    setActiveFileId(data.id)
  }

  const handleCloseFile = async (id: string) => {
    if (!currentProject) return

    const { error } = await supabase.from("code_files").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting code file:", error)
      return
    }

    if (activeFileId === id && files.length > 1) {
      const remainingFiles = files.filter((f) => f.id !== id)
      setActiveFileId(remainingFiles[0]?.id || null)
    } else if (files.length === 1) {
      handleAddFile()
    }
  }

  const handleRunCode = () => {
    if (!activeFile) return

    try {
      if (activeFile.language === "javascript" || activeFile.language === "typescript") {
        const logs: string[] = []
        const originalLog = console.log
        console.log = (...args) => {
          logs.push(args.join(" "))
        }

        eval(activeFile.content)

        console.log = originalLog
        setOutput(logs.join("\n") || "Code executed successfully (no output)")
      } else if (activeFile.language === "python") {
        setOutput("Python execution not available in browser environment")
      } else {
        setOutput("Code execution not supported for this language")
      }
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to start coding</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-card p-4">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Code Editor</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={activeFile?.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRunCode} className="gap-2">
            <Play className="h-4 w-4" />
            Run Code
          </Button>
        </div>
      </div>

      {/* File Tabs */}
      <div className="flex items-center gap-1 border-b bg-muted/20 px-2">
        <ScrollArea className="flex-1">
          <div className="flex gap-1 py-1">
            {files.map((file) => (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`group flex items-center gap-2 rounded-t-md px-3 py-2 text-sm transition-colors ${
                  activeFileId === file.id ? "bg-card text-foreground" : "text-muted-foreground hover:bg-card/50"
                }`}
              >
                <span>{file.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCloseFile(file.id)
                  }}
                  className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            ))}
          </div>
        </ScrollArea>
        <Button size="sm" variant="ghost" onClick={handleAddFile} className="h-8 w-8 p-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor and Output */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code Editor */}
        <div className="flex flex-1 flex-col border-r overflow-hidden">
          <Textarea
            value={activeFile?.content || ""}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="h-full resize-none rounded-none border-0 font-mono text-sm leading-relaxed focus-visible:ring-0 overflow-auto"
            placeholder="Start coding..."
          />
        </div>

        {/* Output Panel */}
        <div className="flex w-96 flex-col bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Output</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <pre className="font-mono text-sm leading-relaxed text-pretty">
              {output || "Run your code to see output here..."}
            </pre>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
