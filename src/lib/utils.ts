import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Supabase client setup
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://airbwgziktmjtpxcxfyb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpcmJ3Z3ppa3RtanRweGN4ZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1Njc4ODMsImV4cCI6MjA2NzE0Mzg4M30.bKnd9GYcpmkFdMdFYMBiUw7wVw9IQ3cUU9R01FdD-2w'
);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
