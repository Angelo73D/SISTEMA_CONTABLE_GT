import { createClient } from '@supabase/supabase-js';

// Extraemos la URL y la clave asegurando limpiar cualquier espacio o comilla accidental
const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ngeansydoihlxfeiwkhl.supabase.co';
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable__F7tefroJZRcfOd6Q7oP_w_25EIV4Lm';

// Limpieza de caracteres invisibles o comillas extra
const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);