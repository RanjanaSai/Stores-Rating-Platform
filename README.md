* Store Rating Platform

A full-stack web application built with React, TailwindCSS, Supabase, and Framer Motion that provides a role-based store rating system.
The platform supports Admins, Store Owners, and Users with role-specific dashboards.

* Features
* Authentication & Authorization

Email/password authentication via Supabase

Secure JWT-based sessions

Role-based dashboards (Admin, User, Store Owner)

* Dashboards

. Admin Dashboard

Manage users (CRUD)

Manage stores (CRUD)

Role-based filtering, sorting, and searching

Store Owner Dashboard

Manage their own store(s)

View ratings from users

. User Dashboard

Browse stores

Submit ratings & reviews

* Ratings

Interactive star rating component (lucide-react + Tailwind)

Average ratings per store

Total ratings summary on the Admin dashboard

* UI/UX

Built with React + TailwindCSS

Animations via Framer Motion

Responsive design (mobile & desktop)

Reusable UI components (Buttons, Forms, Modals, StatCards, etc.)

* Tech Stack

Frontend: React, React Router, TailwindCSS, Framer Motion

Backend: Supabase (Postgres + Auth + Storage)

Icons: lucide-react

* Project Structure
src/
 ├── components/        # Reusable UI components (Button, FormInput, StarRating, etc.)
 ├── contexts/          # AuthContext (manages Supabase auth state)
 ├── pages/             # Role-based dashboard pages (Admin, User, StoreOwner)
 ├── services/          # Supabase service functions (CRUD for users, stores, ratings)
 ├── App.jsx            # Main router with role-based routing
 └── index.css          # TailwindCSS setup

* Setup Instructions
1. Clone the repository
git clone https://github.com/Ranjanasai/Stores-Rating-Platform.git
cd store-rating-App

2. Install dependencies
npm install

3. Configure Supabase

Create a Supabase project at supabase.com

Copy your project’s URL and anon/public key

Create a file: src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});


Set up your database tables:

users (id, name, email, address, role)

stores (id, name, email, address, owner_id, averageRating, totalRatings)

ratings (id, user_id, store_id, rating, comment)

4. Run development server
npm run dev

5. Build for production
npm run build

* Known Issues

After password change, session refresh may require manual handling

Ensure Supabase RLS (Row Level Security) policies are configured for role-based access
