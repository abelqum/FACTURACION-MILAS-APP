import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://tigtaudyzuwccotsupwu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpZ3RhdWR5enV3Y2NvdHN1cHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjM1OTUsImV4cCI6MjA5MzI5OTU5NX0.hXsZAohm1g6xPW8TvSe38-CoBHaE0Wpurw-YfH7uOmo",
);
