"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createBrowserClient } from "@/lib/supabase/client"
import type { Project } from "@/lib/types"

interface ProjectModalProps {
  project?: Project
  onClose: () => void
  onSuccess?: () => void
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#06b6d4", "#10b981"]

export function ProjectModal({ project, onClose, onSuccess }: ProjectModalProps) {
  const isEdit = !!project

  const [name, setName] = useState(project?.name || "")
  const [description, setDescription] = useState(project?.description || "")
  const [color, setColor] = useState(project?.color || "#6366f1")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createBrowserClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("You must be logged in to create a project")
        setLoading(false)
        return
      }

      if (isEdit && project) {
        const { error: updateError } = await supabase
          .from("projects")
          .update({
            name,
            description,
            color,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id)

        if (updateError) throw updateError

        await supabase.from("activity_logs").insert({
          project_id: project.id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "User",
          action: "updated",
          resource_type: "project",
          resource_name: name,
        })
      } else {
        const { data: newProject, error: insertError } = await supabase
          .from("projects")
          .insert({
            name,
            description,
            color,
            owner_id: user.id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        await supabase.from("project_members").insert({
          project_id: newProject.id,
          user_id: user.id,
          role: "owner",
        })

        await supabase.from("channels").insert({
          project_id: newProject.id,
          name: "general",
        })

        await supabase.from("activity_logs").insert({
          project_id: newProject.id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "User",
          action: "created",
          resource_type: "project",
          resource_name: name,
        })
      }

      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error("[v0] Error saving project:", err)
      setError(err.message || "Failed to save project")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">{isEdit ? "Edit Project" : "New Project"}</h2>

        {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Project Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter project name" />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Color</label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-8 w-8 rounded-lg border-2 transition ${
                    color === c ? "border-gray-800" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent" disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
