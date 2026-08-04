import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/authFetch';
import { resolveApiBase } from '../../utils/resolveApiBase';
import { 
  DollarSign, 
  MapPin, 
  Star, 
  Eye, 
  Mail, 
  Loader2, 
  AlertCircle,
  Filter,
  Search,
  Grid3x3,
  List,
  Heart,
  TrendingUp,
  Users,
  Calendar,
  Phone,
  Mail as MailIcon,
  Edit3,
  Trash2,
  Plus,
  X,
  Check,
  Upload,
  Camera,
  Video,
  FileText,
  MapPin as LocationIcon,
  Tag,
  Building2,
  Home,
  Car,
  Briefcase,
  Laptop,
  Wrench,
  Droplets
} from 'lucide-react';

const GenzAfterWork = ({ user, onFeatureCreated, features = [], isLoading = false }) => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showInquiryForm, setShowInquiryForm] = useState(false);
  const [inquiryData, setInquiryData] = useState({ message: '', contactEmail: '' });
  
  const [filters, setFilters] = useState({
    search: '',
    location: '',
    minPrice: '',
    maxPrice: '',
    featured: 'all',
    status: 'all',
    sortBy: 'price-asc'
  });
  
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };
  
  const filteredFeatures = features.filter(feature => {
    if (filters.search && !feature.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !feature.description.toLowerCase().includes(filters.search.toLowerCase()) &&
        !feature.location.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    
    if (filters.location && !feature.location.toLowerCase().includes(filters.location.toLowerCase())) {
      return false;
    }
    
    if (filters.minPrice && feature.price < parseFloat(filters.minPrice)) {
      return false;
    }
    
    if (filters.maxPrice && feature.price > parseFloat(filters.maxPrice)) {
      return false;
    }
    
    if (filters.featured === 'true' && !feature.featured) {
      return false;
    }
    
    if (filters.featured === 'false' && feature.featured) {
      return false;
    }
    
    if (filters.status !== 'all' && feature.status !== filters.status) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    switch (filters.sortBy) {
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
      case 'inquiries':
        return b.inquiries - a.inquiries;
      default:
        return 0;
    }
  });
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'featured': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const handleInquirySubmit = async (e) => {
    e.preventDefault();
    
    if (!inquiryData.message.trim()) {
      alert('Please enter a message');
      return;
    }
    
    try {
      const response = await authFetch(`${resolveApiBase()}/payment-features/${selectedFeature._id}/inquiry`, {
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
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      alert('Error submitting inquiry');
    }
  };
  
  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            GENZ AFTER WORK
          </h1>
          <p className="text-xl text-gray-300">
            Discover Amazing Features for Real Estate, Services & Businesses
          </p>
        </div>
        
        {/* Main Content */}
        <div className="bg-black rounded-lg shadow-md">
          {/* Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-white mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Search features..."
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-w-32">
                <label className="block text-sm font-medium text-white mb-2">Sort By</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                >
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest First</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="views">Most Viewed</option>
                  <option value="inquiries">Most Inquiries</option>
                </select>
              </div>
              
              <div className="flex-1 min-w-32">
                <label className="block text-sm font-medium text-white mb-2">Price Range (ZAR)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    placeholder="Min"
                    className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                  />
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    placeholder="Max"
                    className="px-3 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                  />
                </div>
              </div>
              
              <div className="flex-1 min-w-32">
                <label className="block text-sm font-medium text-white mb-2">Featured</label>
                <select
                  value={filters.featured}
                  onChange={(e) => handleFilterChange('featured', e.target.value)}
                  className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                >
                  <option value="all">All</option>
                  <option value="true">Featured Only</option>
                  <option value="false">Non-Featured Only</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
              </div>
            ) : filteredFeatures.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-white">No features found</h3>
                <p className="mt-1 text-sm text-gray-400">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFeatures.map((feature) => (
                  <div
                    key={feature._id}
                    className="bg-black rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
                    onClick={() => setSelectedFeature(feature)}
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
                      <h3 className="text-lg font-semibold mb-2 line-clamp-1 text-white">{feature.name}</h3>
                      <p className="text-gray-300 text-sm mb-3 line-clamp-2">{feature.description}</p>
                      
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-green-600 font-semibold">{formatPrice(feature.price)}</span>
                        <span className="text-xs text-gray-500">to {formatPrice(feature.maxPrice)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-300 mb-2">
                        <MapPin size={14} className="mr-1" />
                        {feature.formattedLocation}
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Eye size={14} />
                          {feature.views}
                        </span>
                        <span className="flex items-center gap-1">
                          <MailIcon size={14} />
                          {feature.inquiries}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Feature Detail Modal */}
        {selectedFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-black rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedFeature.name}</h2>
                <button
                  onClick={() => setSelectedFeature(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {selectedFeature.primaryImage && (
                    <img
                      src={selectedFeature.primaryImage}
                      alt={selectedFeature.name}
                      className="w-full h-64 object-cover rounded-lg mb-4"
                    />
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <span className="text-xl font-bold">{formatPrice(selectedFeature.price)}</span>
                      <span className="text-gray-500">to {formatPrice(selectedFeature.maxPrice)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span>{selectedFeature.location}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-gray-600" />
                      <span>{selectedFeature.views} views</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MailIcon className="w-5 h-5 text-gray-600" />
                      <span>{selectedFeature.inquiries} inquiries</span>
                    </div>
                    
                    <div>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedFeature.status)}`}>n
                        {selectedFeature.status}
                      </span>
                      {selectedFeature.featured && (
                        <span className="ml-2 inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                          <Star size={14} fill="currentColor" />
                          Featured
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Description</h3>
                  <p className="text-gray-700 mb-6">{selectedFeature.description}</p>
                  
                  <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
                  {selectedFeature.contactInfo?.phone && (
                    <p className="text-sm text-gray-600 mb-2">
                      <Phone size={16} className="inline mr-2" />
                      {selectedFeature.contactInfo.phone}
                    </p>
                  )}
                  {selectedFeature.contactInfo?.email && (
                    <p className="text-sm text-gray-600 mb-2">
                      <MailIcon size={16} className="inline mr-2" />
                      {selectedFeature.contactInfo.email}
                    </p>
                  )}
                  
                  <button
                    onClick={() => setShowInquiryForm(true)}
                    className="w-full mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <MailIcon size={20} />
                    Submit Inquiry
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Inquiry Form Modal */}
        {showInquiryForm && selectedFeature && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-black rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4 text-white">Submit Inquiry</h3>
              
              <form onSubmit={handleInquirySubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Message</label>
                  <textarea
                    value={inquiryData.message}
                    onChange={(e) => setInquiryData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="I am interested in this feature..."
                    rows="4"
                    className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-white mb-2">Contact Email</label>
                  <input
                    type="email"
                    value={inquiryData.contactEmail}
                    onChange={(e) => setInquiryData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="your@email.com"
                    className="px-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-800 text-white"
                    required
                  />
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowInquiryForm(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Inquiry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenzAfterWork;