-- ============================================================
-- Supabase Migration: Oral Cancer Risk Assessment System
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create 'patients' table
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 0 AND age <= 150),
    gender TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by doctor
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- 2. Create 'predictions' table
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    patient_name TEXT DEFAULT '',
    input_features JSONB,
    final_risk_score DOUBLE PRECISION NOT NULL,
    base_model_predictions JSONB DEFAULT '{}'::jsonb,
    explainability_attention JSONB DEFAULT '{}'::jsonb,
    feature_dependencies JSONB DEFAULT '{}'::jsonb,
    clinical_insight TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure patient columns exist if 'predictions' table already existed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'predictions' AND column_name = 'patient_id'
    ) THEN
        ALTER TABLE predictions ADD COLUMN patient_id UUID REFERENCES patients(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'predictions' AND column_name = 'patient_name'
    ) THEN
        ALTER TABLE predictions ADD COLUMN patient_name TEXT DEFAULT '';
    END IF;
END $$;

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_patient_id ON predictions(patient_id);

-- 3. Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Note: PostgreSQL does NOT support 'CREATE POLICY IF NOT EXISTS'.
-- We drop existing policies first, then create them.
DROP POLICY IF EXISTS "Allow all access to patients" ON patients;
DROP POLICY IF EXISTS "Users can view own patients" ON patients;
DROP POLICY IF EXISTS "Users can insert own patients" ON patients;
DROP POLICY IF EXISTS "Users can update own patients" ON patients;
DROP POLICY IF EXISTS "Users can delete own patients" ON patients;

CREATE POLICY "Allow all access to patients"
    ON patients FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to predictions" ON predictions;
DROP POLICY IF EXISTS "Users can view own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
DROP POLICY IF EXISTS "Users can delete own predictions" ON predictions;

CREATE POLICY "Allow all access to predictions"
    ON predictions FOR ALL
    USING (true)
    WITH CHECK (true);
