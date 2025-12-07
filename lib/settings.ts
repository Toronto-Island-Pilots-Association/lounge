import { createClient } from './supabase/server'

export async function getSetting(key: string): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single()

  if (error || !data) {
    return null
  }

  return data.value
}

export async function getMembershipFee(): Promise<number> {
  const fee = await getSetting('annual_membership_fee')
  return fee ? parseFloat(fee) : 99 // Default to $99 if not set
}

