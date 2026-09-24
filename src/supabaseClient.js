import { createClient } from '@supabase/supabase-js';

// Toma la variable de entorno, y si por alguna razón viene vacía, usa la URL directa
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ngeansydoihlxfeiwkhl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__F7tefroJZRcfOd6Q7oP_w_25EIV4Lm';

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  console.error('Error de inicialización: URL de Supabase inválida:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);