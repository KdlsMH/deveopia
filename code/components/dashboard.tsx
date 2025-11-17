"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, Plus, ArrowRight, Share2, MoreVertical } from "lucide-react"
import { format } from "date-fns"
import { InviteModal } from "@/components/invite-modal"
import { ProjectModal } from "@/components/project-modal"

export function Dashboard() {
  const { projects, meetings, setCurrentProject, setCurrentView, deleteProject } = useApp()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<(typeof projects)[0] | undefined>()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const recentMeetings = meetings.slice(0, 5).sort((a, b) => b.date.getTime() - a.date.getTime())

  const handleInvite = (projectId: string) => {
    setSelectedProjectId(projectId)
    setShowInviteModal(true)
  }

  const handleEditProject = (project: (typeof projects)[0]) => {
    setEditingProject(project)
    setShowProjectModal(true)
    setOpenDropdown(null)
  }

  const handleDeleteProject = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject(projectId)
      setOpenDropdown(null)
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-balance">Welcome to Developia</h1>
          <p className="text-muted-foreground text-pretty">
            Your collaborative workspace for project development and team communication
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditingProject(undefined)
                setShowProjectModal(true)
              }}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <Card
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => {
                    setCurrentProject(project)
                    setCurrentView("chat")
                  }}
                >
                  <CardHeader>
                    <div className="mb-2 flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: project.color }} />
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {project.members.length} members
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInvite(project.id)
                          }}
                        >
                          <Share2 className="h-3 w-3" />
                        </Button>
                        <div className="relative">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdown(openDropdown === project.id ? null : project.id)
                            }}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                          {openDropdown === project.id && (
                            <div className="absolute right-0 mt-1 w-32 rounded-lg border bg-white shadow-lg z-10">
                              <button
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditProject(project)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteProject(project.id)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-balance">{project.name}</CardTitle>
                    <CardDescription className="text-pretty">{project.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(project.updatedAt, "MMM d")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {project.members.slice(0, 2).join(", ")}
                        {project.members.length > 2 && ` +${project.members.length - 2}`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Meetings</h2>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setCurrentView("organization")}>
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-3">
            {recentMeetings.map((meeting) => {
              const project = projects.find((p) => p.id === meeting.projectId)
              return (
                <Card key={meeting.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-lg" style={{ backgroundColor: project?.color || "#6366f1" }} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-balance">{meeting.title}</h3>
                      <p className="text-sm text-muted-foreground text-pretty">{project?.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(meeting.date, "MMM d, yyyy")}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {meeting.duration} min
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {meeting.participants.length}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>

      {showInviteModal && selectedProjectId && (
        <InviteModal projectId={selectedProjectId} onClose={() => setShowInviteModal(false)} />
      )}

      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => {
            setShowProjectModal(false)
            setEditingProject(undefined)
          }}
        />
      )}
    </div>
  )
}
