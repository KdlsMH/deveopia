"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, Users, Plus, ArrowRight, Share2, MoreVertical, UserPlus } from "lucide-react"
import { format } from "date-fns"
import { InviteModal } from "@/components/invite-modal"
import { ProjectModal } from "@/components/project-modal"
import { JoinProjectModal } from "@/components/join-project-modal"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { User } from "@supabase/supabase-js"
import { useProject } from "@/lib/project-context"

interface Project {
  id: string
  name: string
  description: string
  color: string
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
}

interface Meeting {
  id: string
  project_id: string
  title: string
  date: string
  duration: number
  participants: string[]
}

interface DashboardProps {
  setCurrentView: (view: string) => void
}

export function Dashboard({ setCurrentView }: DashboardProps) {
  const supabase = createClient()
  const { setCurrentProjectId } = useProject()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [showJoinProjectModal, setShowJoinProjectModal] = useState(false)

  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      console.log("[v0] Fetching projects for user:", user.id)

      const { data: projectsData, error: projectsError } = await supabase
        .from("projects")
        .select(`
          *,
          project_members!inner(user_id)
        `)
        .eq("project_members.user_id", user.id)
        .order("created_at", { ascending: false })

      if (projectsError) {
        console.error("[v0] Error fetching projects:", projectsError)
      } else {
        const projectsWithMemberCount = await Promise.all(
          (projectsData || []).map(async (project) => {
            const { count } = await supabase
              .from("project_members")
              .select("*", { count: "exact", head: true })
              .eq("project_id", project.id)

            return {
              ...project,
              member_count: count || 0,
            }
          }),
        )

        console.log("[v0] Fetched projects with member counts:", projectsWithMemberCount)
        setProjects(projectsWithMemberCount)
      }

      const { data: meetingsData, error: meetingsError } = await supabase
        .from("meetings")
        .select("*")
        .order("date", { ascending: false })
        .limit(10)

      if (meetingsError) {
        console.error("[v0] Error fetching meetings:", meetingsError)
      } else {
        setMeetings(meetingsData || [])
      }
    }
  }

  useEffect(() => {
    fetchData()

    const projectsChannel = supabase
      .channel("projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      projectsChannel.unsubscribe()
    }
  }, [supabase])

  const handleInvite = (projectId: string) => {
    setSelectedProjectId(projectId)
    setShowInviteModal(true)
  }

  const handleDeleteProject = async (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      const { error } = await supabase.from("projects").delete().eq("id", projectId)

      if (error) {
        console.error("[v0] Error deleting project:", error)
        alert("Failed to delete project")
      } else {
        setProjects(projects.filter((p) => p.id !== projectId))
      }
      setOpenDropdown(null)
    }
  }

  const recentMeetings = meetings.slice(0, 10)

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b bg-background p-8 flex-shrink-0">
        <h1 className="mb-2 text-3xl font-bold text-balance">Welcome to Developia</h1>
        <p className="text-muted-foreground text-pretty">
          Your collaborative workspace for project development and team communication
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex gap-6 p-8">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-semibold">Your Projects</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => setShowJoinProjectModal(true)}
              >
                <UserPlus className="h-4 w-4" />
                Join Project
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setShowProjectModal(true)}>
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2 pr-4">
              {projects.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  <p>No projects yet. Create your first project to get started!</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="relative group">
                    <Card
                      className="cursor-pointer transition-shadow hover:shadow-md"
                      onClick={() => {
                        console.log("[v0] Dashboard: Selecting project:", project.id)
                        setCurrentProjectId(project.id)
                        setCurrentView("chat")
                      }}
                    >
                      <CardHeader>
                        <div className="mb-2 flex items-start justify-between">
                          <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: project.color }} />
                          <div className="flex gap-2">
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
                                <div className="absolute right-0 mt-1 w-32 rounded-lg border bg-card shadow-lg z-10">
                                  <button
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
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
                        <CardDescription className="text-pretty">
                          {project.description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(project.updated_at), "MMM d")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project.member_count || 0} members
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="w-96 flex flex-col overflow-hidden border-l pl-6">
          <div className="mb-4 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-semibold">Recent Meetings</h2>
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setCurrentView("organization")}>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4">
              {recentMeetings.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No meetings yet
                </div>
              ) : (
                recentMeetings.map((meeting) => {
                  const project = projects.find((p) => p.id === meeting.project_id)
                  return (
                    <Card
                      key={meeting.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setCurrentView("organization")}
                    >
                      <CardContent className="flex flex-col gap-2 p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="h-8 w-8 rounded-lg flex-shrink-0"
                            style={{ backgroundColor: project?.color || "#6366f1" }}
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-balance">{meeting.title}</h3>
                            <p className="text-xs text-muted-foreground truncate">{project?.name || "Unknown"}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            {format(new Date(meeting.date), "MMM d")}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {meeting.duration} min
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 flex-shrink-0" />
                            {meeting.participants?.length || 0} people
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {showInviteModal && selectedProjectId && (
        <InviteModal projectId={selectedProjectId} onClose={() => setShowInviteModal(false)} />
      )}

      {showProjectModal && (
        <ProjectModal
          onClose={() => setShowProjectModal(false)}
          onSave={async (name, description, color) => {
            if (!user) return

            const { data, error } = await supabase
              .from("projects")
              .insert({
                name,
                description,
                color,
                owner_id: user.id,
              })
              .select()
              .single()

            if (error) {
              console.error("[v0] Error creating project:", error)
              alert("Failed to create project")
            } else {
              setProjects([data, ...projects])
              setShowProjectModal(false)
            }
          }}
          mode="create"
        />
      )}

      {showJoinProjectModal && (
        <JoinProjectModal user={user} onClose={() => setShowJoinProjectModal(false)} onJoined={fetchData} />
      )}
    </div>
  )
}
