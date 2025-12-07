"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Copy, Check, Mail, LinkIcon, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface InviteModalProps {
  projectId: string
  onClose: () => void
}

export function InviteModal({ projectId, onClose }: InviteModalProps) {
  const supabase = createClient()
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member" | "viewer">("member")
  const [expiryDays, setExpiryDays] = useState(7)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const generateLink = async () => {
      const { data: project } = await supabase.from("projects").select("invite_token").eq("id", projectId).single()

      if (project) {
        const baseUrl = window.location.origin
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + expiryDays)

        const link = `${baseUrl}/invite/${project.invite_token}?role=${role}&expires=${expiryDate.getTime()}`
        setInviteLink(link)
      }
    }

    generateLink()
  }, [projectId, role, expiryDays, supabase])

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = async () => {
    if (!email) return

    setSending(true)
    try {
      // In a real app, you would call an API endpoint to send email
      // For now, we'll just log and show success
      console.log("[v0] Sending invite email to:", email)
      console.log("[v0] Invite link:", inviteLink)
      console.log("[v0] Role:", role)

      // Here you would integrate with email service like SendGrid, Resend, etc.
      // Example: await fetch('/api/send-invite', { method: 'POST', body: JSON.stringify({ email, link: inviteLink, role }) })

      alert(`Invite sent to ${email}! (In production, this would send an actual email)`)
      setEmail("")
    } catch (error) {
      console.error("[v0] Error sending invite:", error)
      alert("Failed to send invite")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg shadow-lg border-0">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Invite Team Members</h2>
            <p className="text-sm text-muted-foreground">Share this project with your team via email or invite link</p>
          </div>

          <div className="space-y-3">
            <Label>Access Level</Label>
            <RadioGroup value={role} onValueChange={(value: any) => setRole(value)}>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="admin" id="admin" />
                <Label htmlFor="admin" className="flex-1 cursor-pointer">
                  <div className="font-medium">Admin</div>
                  <div className="text-sm text-muted-foreground">Can manage project settings and members</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member" className="flex-1 cursor-pointer">
                  <div className="font-medium">Member</div>
                  <div className="text-sm text-muted-foreground">Can view and edit project content</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="viewer" id="viewer" />
                <Label htmlFor="viewer" className="flex-1 cursor-pointer">
                  <div className="font-medium">Viewer</div>
                  <div className="text-sm text-muted-foreground">Can only view project content</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Link Expiry
            </Label>
            <select
              value={expiryDays}
              onChange={(e) => setExpiryDays(Number(e.target.value))}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={365}>Never</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invite by Email
            </Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendEmail()}
              />
              <Button onClick={handleSendEmail} disabled={!email || sending}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>

          {/* Invite link */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Or Share Link
            </Label>
            <div className="flex gap-2">
              <Input type="text" value={inviteLink} readOnly className="bg-muted" />
              <Button onClick={handleCopyLink} variant="outline">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Link expires in {expiryDays === 365 ? "never" : `${expiryDays} day${expiryDays > 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" className="flex-1 bg-transparent">
              Close
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
