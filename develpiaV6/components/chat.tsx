"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Hash, Plus, X } from "lucide-react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  project_id: string
  channel_id: string
  user_id: string
  user_name: string
  content: string
  created_at: string
}

interface Channel {
  id: string
  project_id: string
  name: string
  created_at: string
}

interface ChatProps {
  currentProject: any
  currentUser: any
}

export function Chat({ currentProject, currentUser }: ChatProps) {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!currentProject) return

    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("project_id", currentProject.id)
        .order("name")

      if (error) {
        console.error("[v0] Error fetching channels:", error)
        return
      }

      setChannels(data || [])
      if (data && data.length > 0 && !currentChannel) {
        const generalChannel = data.find((c: Channel) => c.name === "general") || data[0]
        setCurrentChannel(generalChannel)
      }
    }

    fetchChannels()

    const channelSubscription = supabase
      .channel(`channels:${currentProject.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channels",
          filter: `project_id=eq.${currentProject.id}`,
        },
        () => {
          fetchChannels()
        },
      )
      .subscribe()

    return () => {
      channelSubscription.unsubscribe()
    }
  }, [currentProject])

  useEffect(() => {
    if (!currentProject || !currentChannel) return

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("project_id", currentProject.id)
        .eq("channel_id", currentChannel.id)
        .order("created_at", { ascending: true })

      if (error) {
        console.error("[v0] Error fetching messages:", error)
        return
      }

      console.log("[v0] Fetched messages for channel:", currentChannel.name, data?.length)
      setMessages(data || [])
    }

    fetchMessages()

    const messageSubscription = supabase
      .channel(`messages:${currentChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${currentChannel.id}`,
        },
        (payload) => {
          console.log("[v0] New message received:", payload.new)
          setMessages((prev) => [...prev, payload.new as Message])
        },
      )
      .subscribe((status) => {
        console.log("[v0] Message subscription status:", status)
      })

    return () => {
      messageSubscription.unsubscribe()
    }
  }, [currentProject, currentChannel])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [messages])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentProject || !currentChannel || !currentUser) return

    const { error } = await supabase.from("messages").insert({
      project_id: currentProject.id,
      channel_id: currentChannel.id,
      user_id: currentUser.id,
      user_name: currentUser.name || currentUser.email,
      content: messageInput,
      type: "text",
    })

    if (error) {
      console.error("[v0] Error sending message:", error)
      return
    }

    await supabase.from("activity_logs").insert({
      project_id: currentProject.id,
      user_id: currentUser.id,
      user_name: currentUser.name || currentUser.email,
      action: "sent message",
      resource_type: "message",
      resource_name: `#${currentChannel.name}`,
    })

    setMessageInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !currentProject) return

    const channelName = newChannelName.toLowerCase().replace(/\s+/g, "-")

    const { data, error } = await supabase
      .from("channels")
      .insert({
        project_id: currentProject.id,
        name: channelName,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating channel:", error)
      return
    }

    await supabase.from("activity_logs").insert({
      project_id: currentProject.id,
      user_id: currentUser.id,
      user_name: currentUser.name || currentUser.email,
      action: "created channel",
      resource_type: "channel",
      resource_name: channelName,
    })

    setNewChannelName("")
    setShowChannelModal(false)
    setCurrentChannel(data)
  }

  const handleDeleteChannel = async (channel: Channel) => {
    if (channel.name === "general" || !currentProject) return

    const { error } = await supabase.from("channels").delete().eq("id", channel.id)

    if (error) {
      console.error("[v0] Error deleting channel:", error)
      return
    }

    if (currentChannel?.id === channel.id) {
      const generalChannel = channels.find((c) => c.name === "general")
      setCurrentChannel(generalChannel || null)
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
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setShowChannelModal(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="space-y-1 p-2">
            {channels.map((channel) => (
              <div key={channel.id} className="group flex items-center gap-1">
                <Button
                  variant={currentChannel?.id === channel.id ? "secondary" : "ghost"}
                  className="flex-1 justify-start gap-2"
                  onClick={() => setCurrentChannel(channel)}
                >
                  <Hash className="h-4 w-4" />
                  {channel.name}
                </Button>
                {channel.name !== "general" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteChannel(channel)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
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
            <h2 className="text-lg font-semibold">{currentChannel?.name || "Select a channel"}</h2>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-muted-foreground">{currentProject.name}</div>
          </div>
        </div>

        {/* Messages - Scrollable Area */}
        <div className="flex-1 overflow-hidden">
          <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden p-4">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {message.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="font-semibold">{message.user_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(message.created_at), "h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-pretty">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Message #${currentChannel?.name || "..."}`}
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

      <Dialog open={showChannelModal} onOpenChange={setShowChannelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Channel</DialogTitle>
            <DialogDescription>Add a new text channel to your project.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel Name</Label>
              <Input
                id="channel-name"
                placeholder="e.g., announcements, support"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCreateChannel()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChannelModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
