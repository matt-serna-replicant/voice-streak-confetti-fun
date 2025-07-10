-- Create voice clips table
CREATE TABLE public.voice_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_ai boolean NOT NULL,
  audio_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_clips ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read voice clips (public game)
CREATE POLICY "Anyone can view voice clips" 
ON public.voice_clips 
FOR SELECT 
USING (true);

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('voice-clips', 'voice-clips', true);

-- Allow public read access to audio files
CREATE POLICY "Public can view audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'voice-clips');

-- Allow authenticated users to upload audio files
CREATE POLICY "Authenticated users can upload audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'voice-clips' AND auth.role() = 'authenticated');