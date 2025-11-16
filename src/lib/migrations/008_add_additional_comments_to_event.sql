-- Add additional_comments column to event table
ALTER TABLE event 
ADD COLUMN IF NOT EXISTS additional_comments TEXT;
