-- Create the database if it doesn't exist
SELECT 'CREATE DATABASE flexidb' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'flexidb');

-- Connect to the database
\c flexidb;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";