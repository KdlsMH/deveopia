"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Copy, Check } from "lucide-react"

interface InviteModalProps {
  projectId: string
  onClose: () => void
}

export function InviteModal({ projectId, onClose }: InviteModalProps) {
  const { generateInviteLink } = useApp()
  const [inviteLink, setInviteLink] = useState("")
  const [copied, setCopied] = useState(false)

  const handleGenerateLink = () => {
    const link = generateInviteLink(projectId)
    setInviteLink(link)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md shadow-lg border-0">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Team Members</h2>

          {!inviteLink ? (
            <div>
              <p className="text-gray-600 mb-4">Generate a unique invite link to share with team members.</p>
              <Button onClick={handleGenerateLink} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Generate Invite Link
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Share this link:</label>
                <div className="flex gap-2 mt-2">
                  <Input type="text" value={inviteLink} readOnly className="bg-gray-50" />
                  <Button onClick={handleCopyLink} variant="outline" className="px-3 bg-transparent">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Anyone with this link can join the project. Share it with your team!
              </p>
            </div>
          )}

          <Button onClick={onClose} variant="outline" className="w-full mt-4 bg-transparent">
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
