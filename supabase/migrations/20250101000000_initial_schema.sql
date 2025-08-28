-- 1. Drop existing objects in reverse order of dependency to ensure a clean slate.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.ratings;
DROP TABLE IF EXISTS public.stores;
DROP TABLE IF EXISTS public.profiles;
DROP TYPE IF EXISTS public.user_role;

-- 2. Create custom types
/*
  # Create user_role type
  [This custom type defines the possible roles a user can have in the system.]

  ## Query Description: [Creates an ENUM type for user roles to ensure data consistency.]
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the type)
*/
CREATE TYPE public.user_role AS ENUM ('admin', 'store_owner', 'user');

-- 3. Create tables in order of dependency
/*
  # Create profiles table
  [This table stores public user data and is linked to the authentication system.]

  ## Query Description: [Creates the main user profile table. It is linked one-to-one with Supabase's auth.users table.]
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)
  
  ## Structure Details:
  - Table: public.profiles
  - Columns: id (PK, references auth.users), name, address, role
  
  ## Security Implications:
  - RLS Status: Will be enabled.
  - Policy Changes: Yes.
  - Auth Requirements: Users can only manage their own profile.
  
  ## Performance Impact:
  - Indexes: Primary key on id.
  - Triggers: A trigger will populate this table on new user creation.
  - Estimated Impact: Low.
*/
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(60) NOT NULL CHECK (char_length(name) >= 20 AND char_length(name) <= 60),
  address VARCHAR(400) NOT NULL CHECK (char_length(address) <= 400),
  role public.user_role NOT NULL DEFAULT 'user'
);
COMMENT ON TABLE public.profiles IS 'Stores public user profile information.';

/*
  # Create stores table
  [This table stores information about the stores on the platform.]

  ## Query Description: [Creates the table for stores. Can be owned by a user with the 'store_owner' role.]
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)
  
  ## Structure Details:
  - Table: public.stores
  - Columns: id, name, email, address, owner_id (FK to profiles)
  
  ## Security Implications:
  - RLS Status: Will be enabled.
  - Policy Changes: Yes.
  - Auth Requirements: Publicly readable, but only admins can create and owners can update.
  
  ## Performance Impact:
  - Indexes: Primary key on id, foreign key on owner_id.
  - Triggers: None.
  - Estimated Impact: Low.
*/
CREATE TABLE public.stores (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  address VARCHAR(400) NOT NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.stores IS 'Represents the stores that can be rated.';

/*
  # Create ratings table
  [This table stores the ratings given by users to stores.]

  ## Query Description: [Creates the ratings table, linking users and stores. A user can only rate a store once.]
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the table)
  
  ## Structure Details:
  - Table: public.ratings
  - Columns: id, user_id (FK to profiles), store_id (FK to stores), rating
  - Constraints: UNIQUE(user_id, store_id)
  
  ## Security Implications:
  - RLS Status: Will be enabled.
  - Policy Changes: Yes.
  - Auth Requirements: Users can manage their own ratings.
  
  ## Performance Impact:
  - Indexes: Primary key on id, foreign keys, unique constraint.
  - Triggers: None.
  - Estimated Impact: Low.
*/
CREATE TABLE public.ratings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (user_id, store_id)
);
COMMENT ON TABLE public.ratings IS 'Stores user ratings for each store.';


-- 4. Create function to handle new user signup (AFTER tables are created)
/*
  # Create handle_new_user function
  [This function automatically creates a profile for a new user upon signup.]

  ## Query Description: [Inserts a new row into public.profiles when a new user is created in auth.users. It pulls metadata from the signup process.]
  
  ## Metadata:
  - Schema-Category: "Data"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true (by dropping the function)
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, address, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'address',
    -- Fallback to 'user' if role is not provided
    COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'user')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates a new user profile upon registration.';

-- 5. Create trigger to call the function
/*
  # Create on_auth_user_created trigger
  [This trigger fires the handle_new_user function after a new user is created.]
*/
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 6. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies

-- Profiles Policies
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- INSERT is handled by the SECURITY DEFINER trigger

-- Stores Policies
CREATE POLICY "Stores are viewable by everyone." ON public.stores FOR SELECT USING (true);
CREATE POLICY "Admins can insert stores." ON public.stores FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Store owners can update their own stores." ON public.stores FOR UPDATE USING (auth.uid() = owner_id AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'store_owner');
CREATE POLICY "Admins can update any store." ON public.stores FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Admins can delete stores." ON public.stores FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Ratings Policies
CREATE POLICY "Ratings are viewable by everyone." ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their own ratings." ON public.ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ratings." ON public.ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ratings." ON public.ratings FOR DELETE USING (auth.uid() = user_id);
