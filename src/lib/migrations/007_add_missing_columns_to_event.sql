-- Add missing columns to the event table if they don't exist
DO $$
BEGIN
    -- Add event_coordinator column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'event_coordinator') THEN
        ALTER TABLE event ADD COLUMN event_coordinator TEXT;
    END IF;
    
    -- Add organization_poc column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'organization_poc') THEN
        ALTER TABLE event ADD COLUMN organization_poc TEXT;
    END IF;
    
    -- Add comments column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'comments') THEN
        ALTER TABLE event ADD COLUMN comments TEXT;
    END IF;
    
    -- Add additional_comments column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'additional_comments') THEN
        ALTER TABLE event ADD COLUMN additional_comments TEXT;
    END IF;
    
    -- Add mode_of_event column if it doesn't exist with default value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'mode_of_event') THEN
        ALTER TABLE event ADD COLUMN mode_of_event TEXT DEFAULT 'In-Person';
    END IF;
    
    -- Add performance_type column if it doesn't exist with default value
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'event' AND column_name = 'performance_type') THEN
        ALTER TABLE event ADD COLUMN performance_type TEXT DEFAULT 'single';
    END IF;
    
    -- Update existing rows with default values if needed
    UPDATE event SET 
        mode_of_event = COALESCE(mode_of_event, 'In-Person'),
        performance_type = COALESCE(performance_type, 'single')
    WHERE mode_of_event IS NULL OR performance_type IS NULL;
    
END $$;
