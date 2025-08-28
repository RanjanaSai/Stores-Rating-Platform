import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import * as service from '../services/supabaseService';
import DashboardLayout from '../components/DashboardLayout';
import Button from '../components/Button';
import StarRating from '../components/StarRating';
import { Search, Star, MapPin } from 'lucide-react';

function UserDashboard() {
  const { user } = useAuth();
  const [stores, setStores] = useState([]);
  const [userRatings, setUserRatings] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const storesData = await service.getAllStoresWithRatings();
      setStores(storesData);

      const ratings = {};
      for (const store of storesData) {
        const userRatingData = await service.getUserRating(store.id, user.id);
        if (userRatingData) {
          ratings[store.id] = userRatingData.rating;
        }
      }
      setUserRatings(ratings);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRateStore = (store) => {
    setSelectedStore(store);
    setRatingModalOpen(true);
  };

  const submitRating = async (rating) => {
    try {
      await service.submitRating(selectedStore.id, user.id, rating);
      setRatingModalOpen(false);
      await loadData(); // Reload all data to get updated averages
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  return (
    <DashboardLayout user={user} title="User Dashboard">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Find Stores</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stores by name or address..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStores.map((store) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex flex-col"
            >
              <div className="flex-grow">
                <h4 className="font-semibold text-gray-900 text-lg mb-2">{store.name}</h4>
                <div className="flex items-center text-gray-600 text-sm mb-4">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="line-clamp-2">{store.address}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Overall Rating</p>
                  <StarRating rating={store.averageRating} readonly />
                  <p className="text-xs text-gray-500 mt-1">
                    Based on {store.totalRatings} rating{store.totalRatings !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Your Rating</p>
                {userRatings[store.id] ? (
                  <div className="space-y-2">
                    <StarRating rating={userRatings[store.id]} readonly />
                    <Button onClick={() => handleRateStore(store)} variant="outline" size="sm" className="w-full">
                      Update Rating
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => handleRateStore(store)} variant="primary" size="sm" className="w-full">
                    Rate This Store
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredStores.length === 0 && !loading && (
          <div className="text-center py-12 col-span-full">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No stores found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No stores are available at the moment.'}
            </p>
          </div>
        )}

        {ratingModalOpen && selectedStore && (
          <RatingModal
            store={selectedStore}
            currentRating={userRatings[selectedStore.id] || 0}
            onClose={() => setRatingModalOpen(false)}
            onSubmit={submitRating}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function RatingModal({ store, currentRating, onClose, onSubmit }) {
  const [rating, setRating] = useState(currentRating);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    await onSubmit(rating);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{currentRating ? 'Update Rating' : 'Rate Store'}</h3>
        <p className="text-gray-600 mb-6">{store.name}</p>
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">How would you rate this store?</p>
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
          {rating > 0 && <p className="text-sm text-gray-600 mt-2">You selected {rating} star{rating !== 1 ? 's' : ''}</p>}
        </div>
        <div className="flex space-x-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={rating === 0 || rating === currentRating} loading={loading} className="flex-1">
            {currentRating ? 'Update' : 'Submit'} Rating
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default UserDashboard;
