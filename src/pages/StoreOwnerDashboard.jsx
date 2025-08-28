import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as service from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import StarRating from '../components/StarRating';
import { Store, Users, Star, ChevronDown } from 'lucide-react';

function StoreOwnerDashboard() {
  const { user } = useAuth();
  const [ownedStores, setOwnedStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState(null);
  const [storeRatings, setStoreRatings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadOwnedStores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const storesData = await service.getStoresByOwner(user.id);
      setOwnedStores(storesData);
      if (storesData.length > 0 && !selectedStoreId) {
        setSelectedStoreId(storesData[0].id);
      }
    } catch (error) {
      console.error('Error loading owned stores:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedStoreId]);

  useEffect(() => {
    loadOwnedStores();
  }, [loadOwnedStores]);

  useEffect(() => {
    if (!selectedStoreId) return;
    const loadSelectedStoreData = async () => {
      try {
        const ratings = await service.getStoreRatingsWithUserDetails(selectedStoreId);
        setStoreRatings(ratings);
      } catch (error) {
        console.error('Error loading data for store:', selectedStoreId, error);
      }
    };
    loadSelectedStoreData();
  }, [selectedStoreId]);

  const selectedStore = useMemo(() => {
    return ownedStores.find(store => store.id === selectedStoreId);
  }, [ownedStores, selectedStoreId]);

  return (
    <DashboardLayout user={user} title="Store Owner Dashboard">
      <div className="space-y-6">
        {loading ? (
          <p>Loading your stores...</p>
        ) : ownedStores.length > 0 && selectedStore ? (
          <>
            {ownedStores.length > 1 && (
              <div className="mb-6">
                <label htmlFor="store-selector" className="block text-sm font-medium text-gray-700 mb-1">Select a Store</label>
                <div className="relative">
                  <select
                    id="store-selector"
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(Number(e.target.value))}
                    className="w-full appearance-none bg-white border border-gray-300 rounded-lg py-2 pl-3 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ownedStores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
                  </select>
                  <ChevronDown className="w-5 h-5 text-gray-400 absolute top-1/2 right-3 transform -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard icon={Store} title="Your Store" value={selectedStore.name} />
              <StatCard icon={Star} title="Average Rating" value={selectedStore.averageRating.toFixed(1)} />
              <StatCard icon={Users} title="Total Ratings" value={selectedStore.totalRatings} />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Ratings</h3>
              {storeRatings.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {storeRatings.map((rating) => <RatingItem key={rating.id} rating={rating} />)}
                </div>
              ) : (
                <p className="text-gray-500">This store has no ratings yet.</p>
              )}
            </div>
            {storeRatings.length > 0 && <RatingDistribution ratings={storeRatings} total={selectedStore.totalRatings} />}
          </>
        ) : (
          <div className="text-center py-12">
            <Store className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No store found</h3>
            <p className="mt-1 text-sm text-gray-500">No store is associated with your account. Please contact the administrator.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const StatCard = ({ icon: Icon, title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border">
    <div className="flex items-center">
      <div className="p-3 bg-blue-100 rounded-lg"><Icon className="w-6 h-6 text-blue-600" /></div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  </div>
);

const RatingItem = ({ rating }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-gray-900">{rating.userName}</p>
      <p className="text-sm text-gray-500">{rating.userEmail}</p>
      <p className="text-xs text-gray-400 mt-1">{new Date(rating.created_at).toLocaleDateString()}</p>
    </div>
    <StarRating rating={rating.rating} readonly />
  </motion.div>
);

const RatingDistribution = ({ ratings, total }) => {
  const distribution = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const rating of ratings) {
      counts[rating.rating]++;
    }
    return Object.entries(counts).map(([star, count]) => ({
      star: Number(star),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    })).sort((a,b) => b.star - a.star);
  }, [ratings, total]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Rating Distribution</h3>
      <div className="space-y-3">
        {distribution.map(({ star, count, percentage }) => (
          <div key={star} className="flex items-center">
            <div className="flex items-center w-12 text-sm text-gray-600">{star} <Star className="w-4 h-4 text-yellow-400 ml-1" /></div>
            <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${percentage}%` }} />
            </div>
            <div className="w-12 text-right text-sm text-gray-600">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoreOwnerDashboard;
