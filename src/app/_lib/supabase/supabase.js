import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://rurbeszsrsahjotyjojn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cmJlc3pzcnNhaGpvdHlqb2puIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMTI2MTUsImV4cCI6MjA5MDU4ODYxNX0.vfx8KkjaqmJ7R27WTffGxWkfW92XOBP3lKQV0_SmFMM",
);
