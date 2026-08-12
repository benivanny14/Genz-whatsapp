import React, { useState, useEffect } from 'react';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
const API_URL = resolveApiBase();
import { DollarSign, MapPin, Star, Eye, Mail, Loader2, AlertCircle, Upload } from 'lucide-react';

const PaymentFeatures = () => {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('price-asc');
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({ message: '', contactEmail: '' });
  
  const categories = ['Real Estate', 'Services', 'Business', 'Automotive', 'Jobs', 'Electronics', 'Other'];
  
  useEffect(() => {
    fetchFeatures();
  }, [searchTerm, categoryFilter, locationFilter, priceRange]);
  
  const fetchFeatures = async () => {
    try {
      setLoading(true);
      let url = `${API_URL}/payment-features?`;
      const params = [];
      
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (categoryFilter) params.push(`category=${encodeURIComponent(categoryFilter)}`);
      if (locationFilter) params.push(`location=${encodeURIComponent(locationFilter)}`);
      if (priceRange.min) params.push(`minPrice=${priceRange.min}`);
      if (priceRange.max) params.push(`maxPrice=${priceRange.max}`);
      
      if (params.length > 0) {
        url += params.join('&');
      }
      
      const response = await authFetch(url);
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch features');
      }
    } catch (error) {
      console.error('Error fetching features:', error);
      setError('Error fetching features');
    } finally {
      setLoading(false);
    }
  };
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const handleFeatureClick = async (featureId) => {
    try {
      const response = await authFetch(`${API_URL}/payment-features/${featureId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedFeature(data.data);
        // Increment view count
        await authFetch(`${API_URL}/payment-features/${featureId}/inquiry`, {
          method: 'POST'
        });
        // Refresh features to get updated view count
        fetchFeatures();
      }
    } catch (error) {
      console.error('Error fetching feature details:', error);
    }
  };
  
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    
    if (!inquiryData.message.trim()) {
      alert('Please enter a message');
      return;
    }
    
    try {
      const response = await authFetch(`${API_URL}/payment-features/${selectedFeature._id}/inquiry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inquiryData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Inquiry submitted successfully!');
        setShowInquiryForm(false);
        setInquiryData({ message: '', contactEmail: '' });
        // Update the feature with new inquiry count
        fetchFeatures();
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Error submitting inquiry');
    }
  };
  
  const filteredAndSortedFeatures = features
    .filter(feature => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return feature.name.toLowerCase().includes(searchLower) || 
               feature.description.toLowerCase().includes(searchLower) ||
               feature.location.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .filter(feature => {
      if (categoryFilter) return feature.category === categoryFilter;
      return true;
    })
    .filter(feature => {
      if (locationFilter) return feature.location.toLowerCase().includes(locationFilter.toLowerCase());
      return true;
    })
    .filter(feature => {
      if (priceRange.min) {
        const minPrice = parseFloat(priceRange.min);
        if (feature.price < minPrice) return false;
      }
      if (priceRange.max) {
        const maxPrice = parseFloat(priceRange.max);
        if (feature.price > maxPrice) return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'featured':
          return b.featured ? 1 : a.featured;
        case 'views':
          return b.views - a.views;
        default:
          return 0;
      }
    });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'featured': return 'bg-purple-100 text-purple-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Features</h1>
        <p className="text-gray-600">Discover amazing payment features for real estate, services, and businesses</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, description, location..."
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <input
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by location"
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Price (ZAR)</label>
            <input
              type="number"
              value={priceRange.min}
              onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
              placeholder="Min"
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Price (ZAR)</label>
            <input
              type="number"
              value={priceRange.max}
              onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
              placeholder="Max"
              className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
        </div>
      ) : (
        <div>
          {selectedFeature ? (
            <div>
              <button
                onClick={() => setSelectedFeature(null)}
                className="mb-6 flex items-center text-blue-600 hover:text-blue-800"
              >
                ← Back to all features
              </button>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/2">
                    {selectedFeature.primaryImage && (
                      <img
                        src={selectedFeature.primaryImage}
                        alt={selectedFeature.name}
                        className="w-full h-64 md:h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="md:w-1/2 p-6">
                    <h2 className="text-2xl font-bold mb-2">{selectedFeature.name}</h2>
                    <div className="flex items-center gap-4 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedFeature.status)}`}>n
                        {selectedFeature.status}
                      </span>
                      {selectedFeature.featured && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Star size={16} fill="currentColor" />
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                        <span className="text-lg font-semibold">{formatPrice(selectedFeature.price)}</span>
                        <span className="text-gray-500 ml-2">to {formatPrice(selectedFeature.maxPrice)}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                        <span>{selectedFeature.location}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Eye className="w-5 h-5 text-gray-600 mr-2" />
                        <span>{selectedFeature.views} views</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-gray-600 mr-2" />
                        <span>{selectedFeature.inquiries} inquiries</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-6">{selectedFeature.description}</p>
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Contact Information</h3>
                      {selectedFeature.contactInfo?.phone && (
                        <p className="text-sm text-gray-600">Phone: {selectedFeature.contactInfo.phone}</p>
                      )}
                      {selectedFeature.contactInfo?.email && (
                        <p className="text-sm text-gray-600">Email: {selectedFeature.contactInfo.email}</p>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setShowInquiryForm(true)}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Mail size={20} />
                      Submit Inquiry
                    </button>
                  </div>
                </div>
              </div>
              
              {showInquiryForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-xl font-semibold mb-4">Submit Inquiry</h3>
                    <form onSubmit={handleInquirySubmit}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                        <textarea
                          value={inquiryData.message}
                          onChange={(e) => setInquiryData(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="I am interested in this feature..."
                          rows="4"
                          className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Email</label>
                        <input
                          type="email"
                          value={inquiryData.contactEmail}
                          onChange={(e) => setInquiryData(prev => ({ ...prev, contactEmail: e.target.value }))}
                          placeholder="your@email.com"
                          className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setShowInquiryForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Submit Inquiry
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedFeatures.map((feature) => (
                <div
                  key={feature._id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleFeatureClick(feature._id)}
                >
                  <div className="relative">
                    {feature.primaryImage ? (
                      <img
                        src={feature.primaryImage}
                        alt={feature.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <Upload className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    {feature.featured && (
                      <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Star size={14} fill="currentColor" />
                        Featured
                      </span>
                    )}
                    <span className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(feature.status)}`}>n
                      {feature.status}
                    </span>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2 line-clamp-1">{feature.name}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{feature.description}</p>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-green-600 font-semibold">{formatPrice(feature.price)}</span>
                      <span className="text-xs text-gray-500">to {formatPrice(feature.maxPrice)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPin size={14} className="mr-1" />
                      {feature.formattedLocation}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {feature.views}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail size={14} />
                        {feature.inquiries}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentFeatures;