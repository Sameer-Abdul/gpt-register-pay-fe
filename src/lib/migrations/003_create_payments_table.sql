-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    register_id INTEGER NOT NULL REFERENCES register(id),
    utr_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add payment_id column to register table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'register' AND column_name = 'payment_id') THEN
        ALTER TABLE register ADD COLUMN payment_id UUID REFERENCES payments(id);
    END IF;
END $$;
