"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  LayoutDashboard,
  MessageSquare,
  Pencil,
  Video,
  FolderOpen,
  Code,
  Calendar,
  Plus,
  LogOut,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { InviteModal } from "@/components/invite-modal"

export function Sidebar() {
  const { currentView, setCurrentView, projects, currentProject, setCurrentProject, currentUser, logout } = useApp()
  const [showInviteModal, setShowInviteModal] = useState(false)

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "whiteboard", label: "Whiteboard", icon: Pencil },
    { id: "meeting", label: "Meeting", icon: Video },
    { id: "files", label: "Files", icon: FolderOpen },
    { id: "code", label: "Code Editor", icon: Code },
    { id: "organization", label: "Organization", icon: Calendar },
  ] as const

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">Developia</h1>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? "secondary" : "ghost"}
                className={cn("w-full justify-start gap-3", currentView === item.id && "bg-secondary")}
                onClick={() => setCurrentView(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            )
          })}
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Projects</h3>
            <Button size="icon" variant="ghost" className="h-6 w-6">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {projects.map((project) => (
              <div key={project.id} className="group flex items-center gap-1">
                <Button
                  variant={currentProject?.id === project.id ? "secondary" : "ghost"}
                  className="flex-1 justify-start gap-3"
                  onClick={() => setCurrentProject(project)}
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="truncate text-sm">{project.name}</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => setShowInviteModal(true)}
                >
                  <Share2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
            {currentUser?.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-sm min-w-0">
            <div className="font-medium truncate">{currentUser?.name}</div>
            <div className="text-xs text-muted-foreground truncate">{currentUser?.email}</div>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full gap-2 text-red-600 hover:text-red-700 bg-transparent"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {showInviteModal && currentProject && (
        <InviteModal projectId={currentProject.id} onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  )
}
