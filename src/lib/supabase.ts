import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://qsxrnolryfgtcdchubjl.supabase.co'
const supabaseAnonKey = 'sb_publishable_EkLxRNNpACxejdyTaor6_Q_QTkLEQmP'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)