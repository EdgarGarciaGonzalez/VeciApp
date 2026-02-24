import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qsxrnolryfgtcdchubjl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzeHJub2xyeWZndGNkY2h1YmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0Mjk0MDEsImV4cCI6MjA4NzAwNTQwMX0.Mz_D7JR6zaSkwBzMY8r6nLgJUvTrkqYrgZ6QDcuwWMA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)