CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'talentiq'
  ) THEN
    CREATE ROLE talentiq LOGIN PASSWORD 'talentiq_secret';
  END IF;
END $$;

GRANT ALL PRIVILEGES ON DATABASE talentiq TO talentiq;
