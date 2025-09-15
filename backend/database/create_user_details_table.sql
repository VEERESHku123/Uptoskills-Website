-- Create user_details table
CREATE TABLE IF NOT EXISTS user_details (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL CHECK (full_name ~ '^[A-Za-z ]+$' AND LENGTH(TRIM(full_name)) > 0),
  contact_number VARCHAR(10) NOT NULL CHECK (contact_number ~ '^[0-9]{10}$'),
  linkedin_url TEXT CHECK (linkedin_url ~ '^https?://(www\.)?linkedin\.com/.*$' OR linkedin_url IS NULL OR LENGTH(TRIM(linkedin_url)) = 0),
  github_url TEXT CHECK (github_url ~ '^https?://(www\.)?github\.com/.*$' OR github_url IS NULL OR LENGTH(TRIM(github_url)) = 0),
  why_hire_me TEXT NOT NULL CHECK (LENGTH(TRIM(why_hire_me)) > 0),
  profile_completed BOOLEAN DEFAULT TRUE,
  ai_skill_summary TEXT NOT NULL CHECK (LENGTH(TRIM(ai_skill_summary)) > 0),
  domains_of_interest TEXT[] NOT NULL CHECK (array_length(domains_of_interest, 1) >= 2),
  others_domain TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_details_full_name ON user_details(full_name);

-- Grant permissions to team user (adjust username as needed)
GRANT SELECT, INSERT, UPDATE ON user_details TO team_user;
GRANT USAGE, SELECT ON SEQUENCE user_details_id_seq TO team_user;

