"use client"

import { useEffect } from "react"
import { useApp } from "@/lib/store"
import { Sidebar } from "@/components/sidebar"
import { Dashboard } from "@/components/dashboard"
import { Chat } from "@/components/chat"
import { Whiteboard } from "@/components/whiteboard"
import { Meeting } from "@/components/meeting"
import { Files } from "@/components/files"
import { CodeEditor } from "@/components/code-editor"
import { Organization } from "@/components/organization"
import { AuthPage } from "@/components/auth-page"

export default function Home() {
  const { currentView, isLoggedIn, joinProjectByToken } = useApp()

  useEffect(() => {
    if (isLoggedIn) {
      const params = new URLSearchParams(window.location.search)
      const inviteToken = params.get("invite")

      if (inviteToken) {
        joinProjectByToken(inviteToken, "")
        // Remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }
  }, [isLoggedIn, joinProjectByToken])

  if (!isLoggedIn) {
    return <AuthPage />
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {currentView === "dashboard" && <Dashboard />}
        {currentView === "chat" && <Chat />}
        {currentView === "whiteboard" && <Whiteboard />}
        {currentView === "meeting" && <Meeting />}
        {currentView === "files" && <Files />}
        {currentView === "code" && <CodeEditor />}
        {currentView === "organization" && <Organization />}
      </main>
    </div>
  )
}
