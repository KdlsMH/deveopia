export interface Project {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  members: string[]
  color: string
  inviteToken?: string
}

export interface Meeting {
  id: string
  projectId: string
  title: string
  date: Date
  duration: number
  participants: string[]
  notes: string
  recordings?: string[]
}

export interface Message {
  id: string
  projectId: string
  userId: string
  userName: string
  content: string
  timestamp: Date
  type: "text" | "file" | "code"
  channel: string
}

export interface DrawingData {
  id: string
  projectId: string
  paths: Path[]
  timestamp: Date
}

export interface Path {
  points: Point[]
  color: string
  width: number
}

export interface Point {
  x: number
  y: number
}

export interface FileItem {
  id: string
  projectId: string
  name: string
  type: string
  size: number
  url: string
  uploadedBy: string
  uploadedAt: Date
}

export interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: Date
}
