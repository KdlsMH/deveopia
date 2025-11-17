"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Project, Meeting, Message, FileItem, User } from "./types"

interface AppState {
  currentUser: User | null
  users: User[]
  isLoggedIn: boolean

  projects: Project[]
  meetings: Meeting[]
  messages: Message[]
  files: FileItem[]
  currentProject: Project | null
  currentView: "dashboard" | "chat" | "whiteboard" | "meeting" | "files" | "code" | "organization"

  login: (email: string, password: string) => boolean
  signup: (name: string, email: string, password: string) => boolean
  logout: () => void

  setCurrentProject: (project: Project | null) => void
  setCurrentView: (view: AppState["currentView"]) => void
  addProject: (project: Project) => void
  updateProject: (projectId: string, updates: Partial<Project>) => void
  deleteProject: (projectId: string) => void
  addMeeting: (meeting: Meeting) => void
  addMessage: (message: Message) => void
  addFile: (file: FileItem) => void
  generateInviteLink: (projectId: string) => string
  joinProjectByToken: (token: string, userId: string) => boolean
}

const AppContext = createContext<AppState | undefined>(undefined)

const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alice Johnson",
    email: "alice@example.com",
    password: "password123",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "user-2",
    name: "Bob Smith",
    email: "bob@example.com",
    password: "password123",
    createdAt: new Date("2024-01-02"),
  },
]

const mockProjects: Project[] = [
  {
    id: "1",
    name: "Website Redesign",
    description: "Complete overhaul of company website",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    members: ["Alice", "Bob", "Charlie"],
    color: "#6366f1",
    inviteToken: "invite-1",
  },
  {
    id: "2",
    name: "Mobile App Development",
    description: "iOS and Android app for customer engagement",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-22"),
    members: ["Alice", "David", "Eve"],
    color: "#8b5cf6",
    inviteToken: "invite-2",
  },
  {
    id: "3",
    name: "API Integration",
    description: "Third-party API integration for payment processing",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-18"),
    members: ["Bob", "Frank"],
    color: "#06b6d4",
    inviteToken: "invite-3",
  },
]

const mockMeetings: Meeting[] = [
  {
    id: "1",
    projectId: "1",
    title: "Design Review",
    date: new Date("2024-01-20"),
    duration: 60,
    participants: ["Alice", "Bob", "Charlie"],
    notes: "Reviewed initial mockups and discussed color scheme",
  },
  {
    id: "2",
    projectId: "1",
    title: "Sprint Planning",
    date: new Date("2024-01-18"),
    duration: 45,
    participants: ["Alice", "Bob"],
    notes: "Planned tasks for the next two weeks",
  },
  {
    id: "3",
    projectId: "2",
    title: "Technical Architecture",
    date: new Date("2024-01-22"),
    duration: 90,
    participants: ["Alice", "David", "Eve"],
    notes: "Discussed tech stack and database schema",
  },
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [meetings, setMeetings] = useState<Meeting[]>(mockMeetings)
  const [messages, setMessages] = useState<Message[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [currentView, setCurrentView] = useState<AppState["currentView"]>("dashboard")

  const login = (email: string, password: string): boolean => {
    const user = users.find((u) => u.email === email && u.password === password)
    if (user) {
      setCurrentUser(user)
      setIsLoggedIn(true)
      return true
    }
    return false
  }

  const signup = (name: string, email: string, password: string): boolean => {
    const userExists = users.some((u) => u.email === email)
    if (userExists) return false

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      password,
      createdAt: new Date(),
    }
    setUsers([...users, newUser])
    setCurrentUser(newUser)
    setIsLoggedIn(true)
    return true
  }

  const logout = () => {
    setCurrentUser(null)
    setIsLoggedIn(false)
    setCurrentProject(null)
    setCurrentView("dashboard")
  }

  const generateInviteLink = (projectId: string): string => {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return ""

    const token = `invite-${projectId}-${Date.now()}`
    setProjects(projects.map((p) => (p.id === projectId ? { ...p, inviteToken: token } : p)))

    return `${typeof window !== "undefined" ? window.location.origin : ""}?invite=${token}`
  }

  const joinProjectByToken = (token: string, userId: string): boolean => {
    const project = projects.find((p) => p.inviteToken === token)
    if (!project) return false

    const isMember = project.members.includes(currentUser?.name || "")
    if (!isMember) {
      setProjects(
        projects.map((p) =>
          p.id === project.id ? { ...p, members: [...p.members, currentUser?.name || "New Member"] } : p,
        ),
      )
    }
    setCurrentProject(project)
    return true
  }

  const addProject = (project: Project) => {
    setProjects([...projects, project])
  }

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    setProjects(projects.map((p) => (p.id === projectId ? { ...p, ...updates, updatedAt: new Date() } : p)))
  }

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter((p) => p.id !== projectId))
    if (currentProject?.id === projectId) {
      setCurrentProject(null)
    }
  }

  const addMeeting = (meeting: Meeting) => {
    setMeetings([...meetings, meeting])
  }

  const addMessage = (message: Message) => {
    setMessages([...messages, message])
  }

  const addFile = (file: FileItem) => {
    setFiles([...files, file])
  }

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        isLoggedIn,
        projects,
        meetings,
        messages,
        files,
        currentProject,
        currentView,
        login,
        signup,
        logout,
        setCurrentProject,
        setCurrentView,
        addProject,
        updateProject,
        deleteProject,
        addMeeting,
        addMessage,
        addFile,
        generateInviteLink,
        joinProjectByToken,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
