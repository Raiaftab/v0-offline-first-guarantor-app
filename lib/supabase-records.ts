import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase-auth"

export interface GuarantorRecord {
  id?: string
  client_id?: string
  client_name?: string
  co_name: string
  branch?: string
  phone_number?: string
  address?: string
  cnic?: string
  account_number?: string
  disbursement_date?: string
  due_date?: string
  amount?: string
  status?: string
}

export async function saveRecords(records: GuarantorRecord[]) {
  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("User not authenticated")

  try {
    await supabase.from("guarantor_records").delete().eq("user_id", user.id)

    const recordsToInsert = records.map((record) => ({
      ...record,
      user_id: user.id,
    }))

    const { error } = await supabase.from("guarantor_records").insert(recordsToInsert)

    if (error) throw error
  } catch (error: any) {
    throw new Error(`Failed to save records: ${error.message}`)
  }
}

export async function searchRecords(query: string) {
  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("User not authenticated")

  try {
    const { data, error } = await supabase
      .from("guarantor_records")
      .select("*")
      .eq("user_id", user.id)
      .or(`client_id.ilike.%${query}%,client_name.ilike.%${query}%,co_name.ilike.%${query}%,branch.ilike.%${query}%`)

    if (error) throw error
    return data || []
  } catch (error: any) {
    throw new Error(`Search failed: ${error.message}`)
  }
}

export async function getUserRecords() {
  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("User not authenticated")

  try {
    const { data, error } = await supabase.from("guarantor_records").select("*").eq("user_id", user.id)

    if (error) throw error
    return data || []
  } catch (error: any) {
    throw new Error(`Failed to fetch records: ${error.message}`)
  }
}

export async function getRecordCount() {
  const supabase = createClient()
  const user = await getCurrentUser()

  if (!user) throw new Error("User not authenticated")

  try {
    const { count, error } = await supabase
      .from("guarantor_records")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)

    if (error) throw error
    return count || 0
  } catch (error: any) {
    throw new Error(`Failed to get record count: ${error.message}`)
  }
}
