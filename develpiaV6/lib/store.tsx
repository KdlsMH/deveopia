"use client"

import { createContext, useContext, type ReactNode } from "react"
import type { Project, Meeting, Message, FileItem, User } from "./types"

interface AppState {
  currentUser: User | null
  users: User[]
  isLoggedIn: boolean

  projects: Project[]
  meetings: Meeting[]
  messages: Message[]
  files: FileItem[]
  channels: { [projectId: string]: string[] }
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
  deleteFile: (fileId: string) => void
  downloadFile: (file: FileItem) => void
  addMeetingWithDate: (
    projectId: string,
    title: string,
    date: Date,
    participants: string[],
    duration: number,
    notes?: string,
  ) => void
  addNote: (projectId: string, title: string, content: string, date: Date) => void
  generateInviteLink: (projectId: string) => string
  joinProjectByToken: (token: string, userId: string) => boolean
  updateMeeting: (meetingId: string, updates: Partial<Meeting>) => void
  deleteMeeting: (meetingId: string) => void
  addChannel: (projectId: string, channelName: string) => void
  deleteChannel: (projectId: string, channelName: string) => void
  getChannels: (projectId: string) => string[]
}

const AppContext = createContext<AppState | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  return <AppContext.Provider value={{}}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
