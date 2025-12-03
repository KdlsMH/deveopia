"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns"
import { Calendar, Clock, FileText, Plus, MoreVertical, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Meeting {
  id: string
  project_id: string
  title: string
  date: string
  duration: number
  participants: string[]
  notes: string | null
}

interface OrganizationProps {
  currentProjectId: string | null
}

export function Organization({ currentProjectId }: OrganizationProps) {
  const supabase = createClient()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [newMeetingOpen, setNewMeetingOpen] = useState(false)
  const [newNoteOpen, setNewNoteOpen] = useState(false)
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null)
  const [meetingTitle, setMeetingTitle] = useState("")
  const [meetingTime, setMeetingTime] = useState("09:00")
  const [meetingDuration, setMeetingDuration] = useState("60")
  const [meetingNotes, setMeetingNotes] = useState("")

  useEffect(() => {
    if (!currentProjectId) return

    const fetchMeetings = async () => {
      console.log("[v0] Fetching meetings for project:", currentProjectId)
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .eq("project_id", currentProjectId)
        .order("date", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching meetings:", error)
      } else {
        console.log("[v0] Fetched meetings:", data)
        setMeetings(data || [])
      }
    }

    fetchMeetings()

    const meetingsChannel = supabase
      .channel("meetings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings", filter: `project_id=eq.${currentProjectId}` },
        () => {
          console.log("[v0] Meetings changed, refetching...")
          fetchMeetings()
        },
      )
      .subscribe()

    return () => {
      meetingsChannel.unsubscribe()
    }
  }, [currentProjectId, supabase])

  if (!currentProjectId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Select a project to view organization details</p>
      </div>
    )
  }

  const selectedDateMeetings = meetings.filter((m) => isSameDay(new Date(m.date), selectedDate))

  const monthStart = startOfMonth(calendarMonth)
  const monthEnd = endOfMonth(calendarMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const meetingsByDate = meetings.reduce(
    (acc, meeting) => {
      const dateKey = format(new Date(meeting.date), "yyyy-MM-dd")
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(meeting)
      return acc
    },
    {} as Record<string, Meeting[]>,
  )

  const handleAddMeeting = async () => {
    if (!meetingTitle.trim() || !currentProjectId) return

    const [hours, minutes] = meetingTime.split(":").map(Number)
    const meetingDate = new Date(selectedDate)
    meetingDate.setHours(hours, minutes)

    console.log("[v0] Creating meeting:", { title: meetingTitle, date: meetingDate })

    if (editingMeetingId) {
      const { error } = await supabase
        .from("meetings")
        .update({
          title: meetingTitle,
          date: meetingDate.toISOString(),
          duration: Number.parseInt(meetingDuration) || 60,
          notes: meetingNotes,
        })
        .eq("id", editingMeetingId)

      if (error) {
        console.error("[v0] Error updating meeting:", error)
      }
      setEditingMeetingId(null)
    } else {
      const { error } = await supabase.from("meetings").insert({
        project_id: currentProjectId,
        title: meetingTitle,
        date: meetingDate.toISOString(),
        duration: Number.parseInt(meetingDuration) || 60,
        participants: [],
        notes: meetingNotes,
      })

      if (error) {
        console.error("[v0] Error creating meeting:", error)
      }
    }

    setMeetingTitle("")
    setMeetingTime("09:00")
    setMeetingDuration("60")
    setMeetingNotes("")
    setNewMeetingOpen(false)
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    console.log("[v0] Deleting meeting:", meetingId)
    const { error } = await supabase.from("meetings").delete().eq("id", meetingId)

    if (error) {
      console.error("[v0] Error deleting meeting:", error)
    }
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id)
    setMeetingTitle(meeting.title)
    const meetingDate = new Date(meeting.date)
    const hours = meetingDate.getHours().toString().padStart(2, "0")
    const minutes = meetingDate.getMinutes().toString().padStart(2, "0")
    setMeetingTime(`${hours}:${minutes}`)
    setMeetingDuration(meeting.duration.toString())
    setMeetingNotes(meeting.notes || "")
    setNewMeetingOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Project Timeline</h1>
            <p className="text-sm text-muted-foreground">View and manage meetings, notes, and project timeline</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="meetings">All Meetings</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-5">
                {/* Calendar - 3 columns (60%) */}
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="text-lg">Calendar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="text-sm font-semibold">{format(calendarMonth, "MMMM yyyy")}</div>
                      <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => setSelectedDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-transparent"
                        onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                      >
                        Next
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-7 gap-2">
                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                          <div key={day} className="text-xs font-medium text-muted-foreground text-center">
                            {day}
                          </div>
                        ))}
                        {daysInMonth.map((day) => {
                          const dateKey = format(day, "yyyy-MM-dd")
                          const dayMeetings = meetingsByDate[dateKey] || []
                          const hasMeeting = dayMeetings.length > 0
                          const isSelected = isSameDay(day, selectedDate)

                          return (
                            <button
                              key={day.toString()}
                              onClick={() => setSelectedDate(day)}
                              className={`h-16 rounded text-xs font-medium transition-colors flex flex-col items-center justify-center ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : hasMeeting
                                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                                    : "hover:bg-muted"
                              }`}
                              title={dayMeetings.map((m) => m.title).join(", ")}
                            >
                              <div>{format(day, "d")}</div>
                              {hasMeeting && (
                                <div className="text-[10px] truncate w-full px-1 mt-1">{dayMeetings[0].title}</div>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Day Details - 2 columns (40%) */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{format(selectedDate, "MMM d, yyyy")}</CardTitle>
                        <CardDescription>{selectedDateMeetings.length} meetings</CardDescription>
                      </div>
                      <Dialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              setEditingMeetingId(null)
                              setMeetingTitle("")
                              setMeetingTime("09:00")
                              setMeetingDuration("60")
                              setMeetingNotes("")
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            New
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{editingMeetingId ? "Edit Meeting" : "Add Meeting"}</DialogTitle>
                            <DialogDescription>
                              {editingMeetingId ? "Update meeting details" : "Create a new meeting for"}{" "}
                              {format(selectedDate, "MMMM d, yyyy")}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Meeting Title</label>
                              <Input
                                placeholder="e.g., Sprint Review"
                                value={meetingTitle}
                                onChange={(e) => setMeetingTitle(e.target.value)}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium">Time</label>
                                <Input
                                  type="time"
                                  value={meetingTime}
                                  onChange={(e) => setMeetingTime(e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium">Duration (min)</label>
                                <Input
                                  type="number"
                                  value={meetingDuration}
                                  onChange={(e) => setMeetingDuration(e.target.value)}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Meeting Notes</label>
                              <Textarea
                                placeholder="Add notes from the meeting..."
                                value={meetingNotes}
                                onChange={(e) => setMeetingNotes(e.target.value)}
                                className="min-h-24"
                              />
                            </div>
                            <Button onClick={handleAddMeeting} className="w-full">
                              {editingMeetingId ? "Update Meeting" : "Create Meeting"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 overflow-y-auto max-h-96">
                    {selectedDateMeetings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No meetings scheduled for this day</p>
                    ) : (
                      selectedDateMeetings.map((meeting) => (
                        <div key={meeting.id} className="rounded-lg border border-border bg-card/50 p-4">
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold">{meeting.title}</h3>
                              <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(meeting.date), "h:mm a")} · {meeting.duration}m
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditMeeting(meeting)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {meeting.notes && (
                            <div className="rounded-md bg-muted/50 p-3">
                              <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                Notes
                              </div>
                              <p className="text-sm text-pretty">{meeting.notes}</p>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">All Meetings</h2>
              </div>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3 pr-4">
                  {meetings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No meetings yet</p>
                  ) : (
                    meetings.map((meeting) => (
                      <Card key={meeting.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-balance">{meeting.title}</CardTitle>
                              <CardDescription>
                                {format(new Date(meeting.date), "MMMM d, yyyy 'at' h:mm a")}
                              </CardDescription>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditMeeting(meeting)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        {meeting.notes && (
                          <CardContent>
                            <div className="rounded-md bg-muted/50 p-3">
                              <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                Notes
                              </div>
                              <p className="text-sm text-pretty">{meeting.notes}</p>
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  )
}
