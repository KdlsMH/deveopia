"use client"

import { useState } from "react"
import { useApp } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Users, FileText, Plus, ChevronRight } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns"

export function Organization() {
  const { currentProject, meetings } = useApp()
  const [selectedDate, setSelectedDate] = useState(new Date())

  if (!currentProject) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h3 className="mb-2 text-lg font-semibold">No Project Selected</h3>
          <p className="text-sm text-muted-foreground">Select a project from the sidebar to view organization</p>
        </div>
      </div>
    )
  }

  const projectMeetings = meetings.filter((m) => m.projectId === currentProject.id)
  const selectedDateMeetings = projectMeetings.filter((m) => isSameDay(m.date, selectedDate))

  // Calendar generation
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const meetingsByDate = projectMeetings.reduce(
    (acc, meeting) => {
      const dateKey = format(meeting.date, "yyyy-MM-dd")
      if (!acc[dateKey]) acc[dateKey] = []
      acc[dateKey].push(meeting)
      return acc
    },
    {} as Record<string, typeof projectMeetings>,
  )

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <div className="border-b bg-card p-6">
          <h1 className="mb-2 text-2xl font-bold text-balance">Project Organization</h1>
          <p className="text-muted-foreground text-pretty">
            View and manage meetings, notes, and project timeline for {currentProject.name}
          </p>
        </div>

        <ScrollArea className="flex-1 p-6">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="meetings">All Meetings</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-6">
              {/* Calendar View */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{format(selectedDate, "MMMM yyyy")}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                      >
                        Previous
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSelectedDate(new Date())}>
                        Today
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {daysInMonth.map((day) => {
                      const dateKey = format(day, "yyyy-MM-dd")
                      const dayMeetings = meetingsByDate[dateKey] || []
                      const isSelected = isSameDay(day, selectedDate)
                      const isToday = isSameDay(day, new Date())

                      return (
                        <button
                          key={day.toString()}
                          onClick={() => setSelectedDate(day)}
                          className={`relative min-h-16 rounded-lg border p-2 text-left transition-colors ${
                            isSelected
                              ? "border-primary bg-primary/10"
                              : isToday
                                ? "border-primary/50 bg-primary/5"
                                : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="text-sm font-medium">{format(day, "d")}</div>
                          {dayMeetings.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {dayMeetings.slice(0, 2).map((meeting) => (
                                <div
                                  key={meeting.id}
                                  className="truncate rounded bg-primary/20 px-1 text-xs text-primary"
                                >
                                  {meeting.title}
                                </div>
                              ))}
                              {dayMeetings.length > 2 && (
                                <div className="text-xs text-muted-foreground">+{dayMeetings.length - 2} more</div>
                              )}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Selected Date Details */}
              <Card>
                <CardHeader>
                  <CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
                  <CardDescription>
                    {selectedDateMeetings.length === 0
                      ? "No meetings scheduled"
                      : `${selectedDateMeetings.length} meeting${selectedDateMeetings.length > 1 ? "s" : ""} scheduled`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedDateMeetings.length === 0 ? (
                    <div className="py-8 text-center">
                      <Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No meetings on this date</p>
                      <Button size="sm" className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        Schedule Meeting
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedDateMeetings.map((meeting) => (
                        <div key={meeting.id} className="rounded-lg border p-4">
                          <div className="mb-2 flex items-start justify-between">
                            <h3 className="font-semibold text-balance">{meeting.title}</h3>
                            <Badge variant="secondary">{meeting.duration} min</Badge>
                          </div>
                          <div className="mb-3 flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(meeting.date, "h:mm a")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.participants.length} participants
                            </div>
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
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">All Meetings</h2>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Meeting
                </Button>
              </div>
              {projectMeetings.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-semibold">No meetings yet</h3>
                    <p className="mb-4 text-sm text-muted-foreground">Schedule your first meeting to get started</p>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Schedule Meeting
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {projectMeetings
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((meeting) => (
                      <Card key={meeting.id} className="transition-shadow hover:shadow-md">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div
                            className="flex h-12 w-12 flex-col items-center justify-center rounded-lg"
                            style={{ backgroundColor: currentProject.color }}
                          >
                            <div className="text-xs font-semibold text-white">{format(meeting.date, "MMM")}</div>
                            <div className="text-lg font-bold text-white">{format(meeting.date, "d")}</div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-balance">{meeting.title}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(meeting.date, "h:mm a")}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {meeting.participants.length}
                              </div>
                              <Badge variant="secondary">{meeting.duration} min</Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Meeting Notes</h2>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Note
                </Button>
              </div>
              <div className="space-y-3">
                {projectMeetings
                  .filter((m) => m.notes)
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .map((meeting) => (
                    <Card key={meeting.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-balance">{meeting.title}</CardTitle>
                            <CardDescription>{format(meeting.date, "MMMM d, yyyy 'at' h:mm a")}</CardDescription>
                          </div>
                          <Badge variant="secondary">{meeting.participants.length} participants</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-pretty">{meeting.notes}</p>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </div>
  )
}
