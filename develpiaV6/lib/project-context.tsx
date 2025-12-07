"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

interface Project {
  id: string
  name: string
  description?: string
  color: string
  owner_id: string
  created_at: string
  updated_at: string
}

interface User {
  id: string
  email: string
  name: string
  avatar_url?: string
}

interface ProjectContextType {
  currentProjectId: string | null
  setCurrentProjectId: (id: string | null) => void
  currentProject: Project | null
  currentUser: User | null
  projects: Project[]
  loading: boolean
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  // Load user
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

        if (profile) {
          setCurrentUser(profile)
        }
      }
    }
    loadUser()
  }, [])

  // Load projects
  const refreshProjects = async () => {
    if (!currentUser) return

    const { data, error } = await supabase
      .from("projects")
      .select(`
        *,
        project_members!inner(user_id)
      `)
      .eq("project_members.user_id", currentUser.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error loading projects:", error)
    } else {
      setProjects(data || [])
    }
  }

  useEffect(() => {
    if (currentUser) {
      refreshProjects()
    }
  }, [currentUser])

  // Load current project
  useEffect(() => {
    async function loadProject() {
      if (!currentProjectId) {
        setCurrentProject(null)
        setLoading(false)
        return
      }

      setLoading(true)

      const { data, error } = await supabase.from("projects").select("*").eq("id", currentProjectId).single()

      if (error) {
        console.error("[v0] Error loading project:", error)
        setCurrentProject(null)
      } else {
        setCurrentProject(data)
      }

      setLoading(false)
    }

    loadProject()
  }, [currentProjectId])

  return (
    <ProjectContext.Provider
      value={{
        currentProjectId,
        setCurrentProjectId,
        currentProject,
        currentUser,
        projects,
        loading,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error("useProject must be used within a ProjectProvider")
  }
  return context
}
