-- Create storage buckets for user photos
-- Run these commands in your Supabase SQL Editor

-- Create profile-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true);

-- Create id-photos bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-photos', 'id-photos', true);

-- Set up RLS (Row Level Security) policies for profile-photos bucket
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own profile photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for id-photos bucket
CREATE POLICY "Users can upload their own ID photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'id-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own ID photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'id-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own ID photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'id-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own ID photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'id-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
); 