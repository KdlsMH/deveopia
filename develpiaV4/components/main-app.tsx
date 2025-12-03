"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Chat } from "@/components/chat"
import { Whiteboard } from "@/components/whiteboard"
import { Meeting } from "@/components/meeting"
import { Files } from "@/components/files"
import { CodeEditor } from "@/components/code-editor"
import { Organization } from "@/components/organization"
import { useProject } from "@/lib/project-context"

export function MainApp() {
  const router = useRouter()
  const supabase = createClient()
  const [currentView, setCurrentView] = useState<
    "dashboard" | "chat" | "whiteboard" | "meeting" | "files" | "code" | "organization"
  >("dashboard")

  const { currentProject, currentUser, currentProjectId } = useProject()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        window.location.href = "/"
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  return (
    <div className="flex h-screen">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 overflow-hidden">
        {currentView === "dashboard" && <Dashboard setCurrentView={setCurrentView} />}
        {currentView === "chat" && <Chat currentProject={currentProject} currentUser={currentUser} />}
        {currentView === "whiteboard" && <Whiteboard currentProject={currentProject} currentUser={currentUser} />}
        {currentView === "meeting" && <Meeting currentProjectId={currentProjectId} />}
        {currentView === "files" && <Files currentProject={currentProject} currentUser={currentUser} />}
        {currentView === "code" && <CodeEditor currentProject={currentProject} currentUser={currentUser} />}
        {currentView === "organization" && <Organization currentProjectId={currentProjectId} />}
      </main>
    </div>
  )
}
