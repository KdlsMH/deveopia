"use server"
import { createClient } from "@supabase/supabase-js"

export async function joinProjectByToken(token: string, userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Find project by invite token
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, name")
    .eq("invite_token", token)
    .single()

  if (projectError || !project) {
    return { success: false, error: "Invalid invite link or token." }
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("project_members")
    .select("id")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .single()

  if (existingMember) {
    return { success: false, error: "You are already a member of this project." }
  }

  // Add user as member
  const { error: memberError } = await supabase.from("project_members").insert({
    project_id: project.id,
    user_id: userId,
    role: "member",
  })

  if (memberError) {
    return { success: false, error: "Failed to join project." }
  }

  // Log activity
  await supabase.from("activity_logs").insert({
    project_id: project.id,
    user_id: userId,
    user_name: "",
    action: "joined",
    resource_type: "project",
    resource_name: project.name,
  })

  return { success: true, projectId: project.id, projectName: project.name }
}
