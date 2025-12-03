"use client"

import { useState } from "react"
import { joinProjectByToken } from "@/app/actions/join-project"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Link2, Loader2 } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface JoinProjectModalProps {
  user: User | null
  onClose: () => void
  onJoined: () => void
}

export function JoinProjectModal({ user, onClose, onJoined }: JoinProjectModalProps) {
  const [inviteLink, setInviteLink] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const extractToken = (input: string): string => {
    console.log("[v0] Extracting token from input:", input)

    const pathMatch = input.match(/\/invite\/([a-f0-9]+)/)
    if (pathMatch) {
      console.log("[v0] Extracted token from path:", pathMatch[1])
      return pathMatch[1]
    }

    const queryMatch = input.match(/[?&]token=([a-zA-Z0-9-]+)/)
    if (queryMatch) {
      console.log("[v0] Extracted token from query:", queryMatch[1])
      return queryMatch[1]
    }

    if (/^[a-f0-9]+$/.test(input.trim())) {
      console.log("[v0] Direct token input:", input.trim())
      return input.trim()
    }

    console.log("[v0] Returning input as-is:", input.trim())
    return input.trim()
  }

  const handleJoin = async () => {
    if (!inviteLink.trim() || !user) {
      console.log("[v0] Join failed: No invite link or user", { inviteLink, user: !!user })
      return
    }

    setIsLoading(true)
    setError(null)
    console.log("[v0] Starting join process with link:", inviteLink)

    try {
      const token = extractToken(inviteLink)
      console.log("[v0] Extracted token:", token)

      const result = await joinProjectByToken(token, user.id)
      console.log("[v0] Join result:", result)

      if (!result.success) {
        setError(result.error || "Failed to join project.")
        setIsLoading(false)
        return
      }

      console.log("[v0] Successfully joined project:", result.projectName)
      onJoined()
      onClose()
    } catch (err) {
      console.error("[v0] Unexpected error joining project:", err)
      setError("An unexpected error occurred.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Join Project
          </DialogTitle>
          <DialogDescription>
            Enter the invite link or token shared by your team member to join their project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="invite-link">Invite Link or Token</Label>
            <Input
              id="invite-link"
              placeholder="Paste invite link or token..."
              value={inviteLink}
              onChange={(e) => {
                setInviteLink(e.target.value)
                setError(null)
              }}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <p className="text-xs text-muted-foreground">
              Example: https://webdevelopia.vercel.app/invite/f0f7817f... or just the token
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleJoin} disabled={!inviteLink.trim() || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Project"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
