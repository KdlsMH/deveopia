"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Hash, Plus } from 'lucide-react'
import { format } from "date-fns"
import type { Message } from "@/lib/types"

export function Chat() {
  const { currentProject, messages, addMessage } = useApp()
  const [messageInput, setMessageInput] = useState("")
  const [currentChannel, setCurrentChannel] = useState("general")
  const scrollRef = useRef<HTMLDivElement>(null)

  const channels = ["general", "development", "design", "random"]

  const projectMessages = messages.filter(
    (m) => m.projectId === currentProject?.id && m.channel === currentChannel
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [projectMessages])

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentProject) return

    const newMessage: Message = {
      id: Date.now().toString(),
      projectId: currentProject.id,
      userId: "user-1",
      userName: "User",
      content: messageInput,
      timestamp: new Date(),
      type: "text",
      channel: currentChannel,
    }

    addMessage(newMessage)
    setMessageInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Channel Sidebar */}
      <div className="w-60 border-r bg-card">
        <div className="flex h-16 items-center justify-between border-b px-4">
          <h2 className="font-semibold">Channels</h2>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-1 p-2">
            {channels.map((channel) => (
              <Button
                key={channel}
                variant={currentChannel === channel ? "secondary" : "ghost"}
                className="w-full justify-start gap-2"
                onClick={() => setCurrentChannel(channel)}
              >
                <Hash className="h-4 w-4" />
                {channel}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {/* Chat Header */}
        <div className="flex h-16 items-center border-b px-6">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{currentChannel}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-muted-foreground">{currentProject.name}</div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {projectMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              projectMessages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                      {message.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-semibold">{message.userName}</span>
                      <span className="text-xs text-muted-foreground">{format(message.timestamp, "h:mm a")}</span>
                    </div>
                    <p className="text-sm text-pretty">{message.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Message #${currentChannel}`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
