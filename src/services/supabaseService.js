import { supabase } from '../supabaseClient';

// Helper function to calculate ratings
const calculateStoreRatings = (stores, ratings) => {
  return stores.map(store => {
    const storeRatings = ratings.filter(r => r.store_id === store.id);
    const totalRatings = storeRatings.length;
    if (totalRatings === 0) {
      return { ...store, averageRating: 0, totalRatings: 0 };
    }
    const sum = storeRatings.reduce((acc, r) => acc + r.rating, 0);
    const averageRating = (sum / totalRatings).toFixed(1);
    return { ...store, averageRating: parseFloat(averageRating), totalRatings };
  });
};

// --- User & Profile Functions ---

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) throw error;
  return data;
};

// --- Store Functions ---

export const getAllStoresWithRatings = async () => {
  const { data: stores, error: storesError } = await supabase.from('stores').select('*');
  if (storesError) throw storesError;

  const { data: ratings, error: ratingsError } = await supabase.from('ratings').select('store_id, rating');
  if (ratingsError) throw ratingsError;

  return calculateStoreRatings(stores, ratings);
};

export const getStoresByOwner = async (ownerId) => {
  const { data: stores, error: storesError } = await supabase.from('stores').select('*').eq('owner_id', ownerId);
  if (storesError) throw storesError;

  const storeIds = stores.map(s => s.id);
  const { data: ratings, error: ratingsError } = await supabase.from('ratings').select('store_id, rating').in('store_id', storeIds);
  if (ratingsError) throw ratingsError;

  return calculateStoreRatings(stores, ratings);
};

// export const createStore = async (storeData) => {
//   const { data, error } = await supabase.from('stores').insert([storeData]).select().single();
//   if (error) throw error;
//   return data;
// };
export async function createStore(data) {
  const { data: store, error } = await supabase
    .from('stores')
    .insert([data])
    .select('*')
    .single();

  if (error) throw error;
  return store;
}

// --- Rating Functions ---

export const submitRating = async (storeId, userId, rating) => {
  const { data, error } = await supabase
    .from('ratings')
    .upsert({ store_id: storeId, user_id: userId, rating: rating }, { onConflict: 'store_id, user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getUserRating = async (storeId, userId) => {
  const { data, error } = await supabase
    .from('ratings')
    .select('rating')
    .eq('store_id', storeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const getStoreRatingsWithUserDetails = async (storeId) => {
  const { data: ratings, error } = await supabase
    .from('ratings')
    .select(`
      *,
      profiles (
        name,
        email
      )
    `)
    .eq('store_id', storeId);

  if (error) throw error;

  // Restructure data to be more usable
  return ratings.map(r => ({
    ...r,
    userName: r.profiles.name,
    userEmail: r.profiles.email,
  }));
};
