/*
# [Initial Schema Setup]
This script sets up the initial database schema for the Store Rating Platform.
It creates tables for user profiles, stores, and ratings, establishes relationships
between them, and sets up row-level security policies to protect user data.

## Query Description: [This script will drop existing tables (profiles, stores, ratings) if they exist, and then recreate them from scratch. This is to ensure a clean setup after the previous script failed. No data will be lost as this is the initial setup.]

## Metadata:
- Schema-Category: ["Structural"]
- Impact-Level: ["High"]
- Requires-Backup: [false]
- Reversible: [true] (by dropping the created objects)

## Structure Details:
- Tables created: profiles, stores, ratings
- Types created: user_role (enum)
- Functions created: handle_new_user, assign_store_owner
- Triggers created: on_auth_user_created, on_profile_created

## Security Implications:
- RLS Status: Enabled on all tables
- Policy Changes: [Yes]
- Auth Requirements: Policies are tied to authenticated users and their roles.
*/

-- Drop existing objects in reverse order of dependency to avoid errors
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
DROP FUNCTION IF EXISTS public.assign_store_owner();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP POLICY IF EXISTS "Users can delete their own ratings." ON public.ratings;
DROP POLICY IF EXISTS "Users can update their own ratings." ON public.ratings;
DROP POLICY IF EXISTS "Users can insert their own ratings." ON public.ratings;
DROP POLICY IF EXISTS "Users can view all ratings." ON public.ratings;

DROP POLICY IF EXISTS "Admins can delete stores." ON public.stores;
DROP POLICY IF EXISTS "Admins or owners can update stores." ON public.stores;
DROP POLICY IF EXISTS "Admins can insert stores." ON public.stores;
DROP POLICY IF EXISTS "Users can view all stores." ON public.stores;

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles." ON public.profiles;

DROP TABLE IF EXISTS public.ratings;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.profiles;
DROP TYPE IF EXISTS public.user_role;

-- 1. Create a custom type for user roles
CREATE TYPE public.user_role AS ENUM ('admin', 'user', 'store_owner');

-- 2. Create the profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(60) NOT NULL,
    address VARCHAR(400) NOT NULL,
    role public.user_role NOT NULL DEFAULT 'user',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Stores public-facing profile information for each user.';

-- 3. Create the stores table
CREATE TABLE public.stores (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address VARCHAR(400) NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE public.stores IS 'Stores information about each business or store.';

-- 4. Create the ratings table
CREATE TABLE public.ratings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, store_id) -- Ensures a user can only rate a store once
);
COMMENT ON TABLE public.ratings IS 'Stores user ratings for each store.';

-- 5. Set up a function to automatically create a profile for a new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, address, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'address',
    (new.raw_user_meta_data->>'role')::public.user_role
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a trigger to call the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 7. Function to assign a profile as a store owner
CREATE OR REPLACE FUNCTION public.assign_store_owner()
RETURNS TRIGGER AS $$
BEGIN
  IF new.role = 'store_owner' THEN
    UPDATE public.stores
    SET owner_id = new.id
    WHERE email = (SELECT email FROM auth.users WHERE id = new.id);
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to assign store ownership when a profile is created or updated
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.assign_store_owner();

-- 9. Enable Row Level Security (RLS) for all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for the 'profiles' table
CREATE POLICY "Users can view all profiles." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 11. Create RLS policies for the 'stores' table
CREATE POLICY "Users can view all stores." ON public.stores FOR SELECT USING (true);
CREATE POLICY "Admins can insert stores." ON public.stores FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins or owners can update stores." ON public.stores FOR UPDATE TO authenticated USING (((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') OR (auth.uid() = owner_id)) WITH CHECK (((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin') OR (auth.uid() = owner_id));
CREATE POLICY "Admins can delete stores." ON public.stores FOR DELETE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- 12. Create RLS policies for the 'ratings' table
CREATE POLICY "Users can view all ratings." ON public.ratings FOR SELECT USING (true);
-- CORRECTED POLICIES: Split UPSERT into INSERT and UPDATE
CREATE POLICY "Users can insert their own ratings." ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings." ON public.ratings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings." ON public.ratings FOR DELETE TO authenticated USING (auth.uid() = user_id);
