import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL or SUPABASE_KEY not set in .env")
    exit(1)

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Try to select from a non-existent table to get a list of tables from the error?
    # Or just try to select from 'profiles' to see if it works now.
    print("Checking 'profiles' table...")
    try:
        response = supabase.table("profiles").select("*").limit(1).execute()
        print("Table 'profiles' exists.")
        print(response)
    except Exception as e:
        print(f"Error accessing 'profiles': {e}")
        
    # There isn't a direct 'list_tables' method in the client easily accessible without admin rights or SQL.
    # But we can try to query information_schema if we have permissions, but usually we don't via the API client.
    
except Exception as e:
    print(f"Error connecting to Supabase: {e}")
