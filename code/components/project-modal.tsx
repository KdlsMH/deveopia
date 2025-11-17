"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Project } from "@/lib/types"

interface ProjectModalProps {
  project?: Project
  onClose: () => void
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316", "#eab308", "#06b6d4", "#10b981"]

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  const { addProject, updateProject } = useApp()
  const isEdit = !!project

  const [name, setName] = useState(project?.name || "")
  const [description, setDescription] = useState(project?.description || "")
  const [color, setColor] = useState(project?.color || "#6366f1")
  const [error, setError] = useState("")

  const handleSubmit = () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    if (isEdit && project) {
      updateProject(project.id, { name, description, color })
    } else {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name,
        description,
        color,
        members: ["You"],
        createdAt: new Date(),
        updatedAt: new Date(),
        inviteToken: `invite-${Date.now()}`,
      }
      addProject(newProject)
    }

    onClose()
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
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              {isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
