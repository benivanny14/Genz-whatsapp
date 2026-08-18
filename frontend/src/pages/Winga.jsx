import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, X, Shirt, Home, Smartphone, Speaker, Laptop, LandPlot,
  DollarSign, Footprints, Tv, Armchair, Package, Image as ImageIcon, Trash2,
  MessageCircle, ChevronLeft, Camera, Loader2, Store, CheckCircle2, Tag, Star,
  ShoppingCart, ClipboardList, BarChart3, Check, XCircle, Eye, Bell, Search, PackageCheck
} from 'lucide-react';
import { useChat } from '../context/ChatContext';
import apiService from '../services/apiService';
import { authFetch } from '../utils/authFetch';
import { resolveApiBase } from '../utils/resolveApiBase';
import { resolveMediaPlaybackUrl } from '../utils/sanitizeMediaUrl';
import toast from 'react-hot-toast';

const CATEGORY_META = [
  { id: 'nguo', label: 'Clothes', icon: Shirt },
  { id: 'home-accessories', label: 'Home Accessories', icon: Home },
  { id: 'simu', label: 'Phones', icon: Smartphone },
  { id: 'speakers', label: 'Speakers', icon: Speaker },
  { id: 'laptop', label: 'Laptop', icon: Laptop },
  { id: 'viwanja', label: 'Plots', icon: LandPlot },
  { id: 'dalari', label: 'Dollars', icon: DollarSign },
  { id: 'viatu', label: 'Shoes', icon: Footprints },
  { id: 'sandals', label: 'Sandals', icon: Footprints },
  { id: 'tv', label: 'TV', icon: Tv },
  { id: 'furniture', label: 'Furniture', icon: Armchair },
  { id: 'other', label: 'Other', icon: Package }
];

const CATEGORY_EMOJI = {
  nguo: '👕', 'home-accessories': '🏠', simu: '📱', speakers: '🔊', laptop: '💻',
  viwanja: '🌍', dalari: '💵', viatu: '👟', sandals: '🩴', tv: '📺',
  furniture: '🛋️', other: '📦'
};

const formatPrice = (listing) => {
  if (listing.priceText) return listing.priceText;
  if (listing.price && Number(listing.price) > 0) {
    return `TZS ${Number(listing.price).toLocaleString()}`;
  }
  return 'Price: Negotiable';
};

// Interactive star row (read-only when onChange is omitted).
const StarRating = ({ value, size = 13, onChange }) => {
  const v = Math.max(1, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange && onChange(n)}
          aria-label={`${n} star`}
          className={onChange ? 'cursor-pointer transition hover:scale-125' : 'cursor-default'}
        >
          <Star size={size} className={`${n <= v ? 'fill-amber-400 text-amber-400' : 'text-white/25'}`} />
        </button>
      ))}
    </div>
  );
};

const RatingSummary = ({ rating }) => {
  const rs = rating || { avg: 0, count: 0 };
  if (!rs.count) return null;
  return (
    <div className="flex items-center gap-1.5">
      <StarRating value={rs.avg} size={12} />
      <span className="text-[11px] text-white/50">
        {rs.avg} ({rs.count})
      </span>
    </div>
  );
};

const Winga = () => {
  const navigate = useNavigate();
  const {
    user, wingaData, fetchWinga, createWingaListing, markWingaViewed,
    uploadWingaMedia, deleteWingaListing, toggleWingaSold, rateWingaListing,
    wingaOrders, fetchWingaOrders, placeWingaOrder, updateWingaOrder,
    selectConversation, refreshConversations
  } = useChat();

  const [view, setView] = useState('categories'); // 'categories' | 'category'
  const [activeCategory, setActiveCategory] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [viewerListing, setViewerListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mediaIndex, setMediaIndex] = useState(0);

  // Post form state
  const [postCategory, setPostCategory] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postPrice, setPostPrice] = useState('');
  const [postLocation, setPostLocation] = useState('');
  const [postMedia, setPostMedia] = useState([]); // [{ url, type }]
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  // Rating / review state
  const [rateTarget, setRateTarget] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [rateComment, setRateComment] = useState('');
  const [reviewsList, setReviewsList] = useState([]);
  const [rateSaving, setRateSaving] = useState(false);

  // Order / booking state
  const [orderTarget, setOrderTarget] = useState(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderMsg, setOrderMsg] = useState('');
  const [orderSaving, setOrderSaving] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [ordersTab, setOrdersTab] = useState('received'); // 'received' | 'sent'
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showBell, setShowBell] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchWinga();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchWinga]);

  const categories = wingaData?.categories || [];
  const totalUnseen = wingaData?.totalUnseen || 0;
  const myListings = wingaData?.myListings || [];
  const postedToday = wingaData?.postedToday || 0;
  const dailyLimit = wingaData?.limit || 15;

  const categoryMeta = (id) => CATEGORY_META.find((c) => c.id === id) || CATEGORY_META[CATEGORY_META.length - 1];

  const openCategory = (id) => {
    setActiveCategory(id);
    setView('category');
  };

  // ── Chat with the seller (jiji.com style) ──
  const chatWithSeller = useCallback(async (sellerId, sellerName) => {
    if (!sellerId || String(sellerId) === String(user?._id || user?.id)) {
      toast('This is your own listing');
      return;
    }
    try {
      const res = await apiService.getOrCreateConversation(sellerId);
      if (res?.success && res.conversation) {
        await refreshConversations();
        selectConversation(res.conversation);
        navigate('/chat');
      } else {
        toast.error(res?.message || 'Failed to open chat');
      }
    } catch (err) {
      console.error('Open chat with seller failed:', err);
      toast.error('Failed to open chat');
    }
  }, [user, refreshConversations, selectConversation, navigate]);

  // ── View a listing (marks it as seen) ──
  const openListing = (listing) => {
    setMediaIndex(0);
    setViewerListing(listing);
    if (!listing.viewedByMe && String(listing.user?._id || listing.userId) !== String(user?._id || user?.id)) {
      markWingaViewed(listing._id);
    }
  };

  // ── Media upload ──
  const handleFiles = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (postMedia.length + list.length > 10) {
      toast.error('Maximum 10 photos/videos per listing');
      return;
    }
    for (const file of list) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`${file.name} si picha au video`);
        continue;
      }
      const data = await uploadWingaMedia(file);
      if (data?.success) {
        setPostMedia((prev) => [...prev, { url: data.fileUrl, type: data.mediaType || 'image' }]);
      } else {
        toast.error(`Upload imeshindikana: ${file.name}`);
      }
    }
  };

  const submitListing = async () => {
    if (!postCategory) return toast.error('Choose your business category');
    if (!postTitle.trim()) return toast.error('Enter your business name');
    if (postMedia.length === 0) return toast.error('Add at least one photo or video');

    setPosting(true);
    try {
      const data = await createWingaListing({
        category: postCategory,
        title: postTitle.trim(),
        description: postDesc.trim(),
        price: Number(postPrice) || 0,
        priceText: postPrice ? `TZS ${postPrice}` : '',
        location: postLocation.trim(),
        media: postMedia
      });
      if (data?.success) {
        toast.success('Your listing has been published on WINGA! 🎉');
        setShowPost(false);
        setPostCategory('');
        setPostTitle('');
        setPostDesc('');
        setPostPrice('');
        setPostLocation('');
        setPostMedia([]);
        if (data.listing?.category) openCategory(data.listing.category);
      } else if (data?.code === 'DAILY_LIMIT_REACHED') {
        toast.error(data.message || `You have reached the daily listing limit of ${dailyLimit}`);
      } else {
        toast.error(data?.message || 'Failed to publish listing');
      }
    } finally {
      setPosting(false);
    }
  };

  const removeMyListing = async (listing) => {
    if (!window.confirm(`Delete "${listing.title}"?`)) return;
    const data = await deleteWingaListing(listing._id);
    if (data?.success) toast.success('Listing deleted');
    else toast.error(data?.message || 'Failed to delete');
  };

  // ── Rating / reviews ──
  const openRateModal = async (listing) => {
    setRateTarget(listing);
    setMyRating(0);
    setRateComment('');
    setReviewsList([]);
    try {
      const res = await authFetch(`${resolveApiBase()}/winga/${encodeURIComponent(listing._id)}/reviews`);
      const data = await res.json();
      if (data?.success) setReviewsList(data.reviews || []);
    } catch (_) { /* ignore */ }
  };

  const submitRating = async () => {
    if (!rateTarget || myRating < 1) {
      toast.error('Choose 1 to 5 stars');
      return;
    }
    setRateSaving(true);
    try {
      const data = await rateWingaListing(rateTarget._id, myRating, rateComment);
      if (data?.success) {
        toast.success('Thank you for your rating! ⭐');
        setRateTarget(null);
        setMyRating(0);
        setRateComment('');
      } else {
        toast.error(data?.message || 'Failed to submit rating');
      }
    } finally {
      setRateSaving(false);
    }
  };

  // ── Order / booking flow ──
  const openOrderModal = (listing) => {
    setOrderTarget(listing);
    setOrderQty(1);
    setOrderMsg('');
  };

  const submitOrder = async () => {
    if (!orderTarget) return;
    setOrderSaving(true);
    try {
      const data = await placeWingaOrder(orderTarget._id, { quantity: orderQty, message: orderMsg });
      if (data?.success) {
        toast.success('Your purchase request has been sent! 📦');
        setOrderTarget(null);
        setOrderMsg('');
      } else {
        toast.error(data?.message || 'Failed to submit request');
      }
    } finally {
      setOrderSaving(false);
    }
  };

  const openOrders = async () => {
    setShowOrders(true);
    await fetchWingaOrders();
  };

  const setOrderStatus = async (orderId, status) => {
    const data = await updateWingaOrder(orderId, status);
    if (data?.success) {
      toast.success(
        status === 'confirmed' ? 'Request confirmed! Listing marked SOLD ✅' :
        status === 'declined' ? 'Request declined' :
        'Request cancelled'
      );
    } else {
      toast.error(data?.message || 'Failed to update request');
    }
  };

  // ── Search across all categories ──
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return (wingaData?.categories || [])
      .flatMap((c) => c.listings || [])
      .filter((l) => (l.title || '').toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q));
  }, [searchQuery, wingaData]);

  // ── Bell notifications ──
  const openBell = async () => {
    setShowBell(true);
    await fetchWingaOrders();
  };

  const markOrderCompleted = async (orderId) => {
    const data = await updateWingaOrder(orderId, 'completed');
    if (data?.success) {
      toast.success('You received the item! Thank you 📦');
    } else {
      toast.error(data?.message || 'Failed to complete request');
    }
  };

  // ── Seller analytics ──
  const openStats = async () => {
    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await authFetch(`${resolveApiBase()}/winga/stats`);
      const data = await res.json();
      if (data?.success) setStatsData(data);
      else toast.error(data?.message || 'Failed to load stats');
    } catch (_) {
      toast.error('Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const renderMedia = (listing, className = 'w-full h-48 object-cover') => {
    const first = listing.media?.[0];
    if (!first) {
      return (
        <div className={`${className} flex items-center justify-center bg-gradient-to-br from-[#075E54] to-[#128C7E]`}>
          <Store size={36} className="text-white/70" />
        </div>
      );
    }
    const url = resolveMediaPlaybackUrl(first.url);
    if (first.type === 'video') {
      return <video src={url} className={className} muted playsInline preload="metadata" />;
    }
    return <img src={url} alt={listing.title} className={className} loading="lazy" />;
  };

  const remainingToday = Math.max(0, dailyLimit - postedToday);

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#111b21]/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-4 py-3">
          {view === 'category' ? (
            <button
              type="button"
              onClick={() => setView('categories')}
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
              aria-label="Back to categories"
            >
              <ChevronLeft size={22} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/chat')}
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
              <Store size={20} className="text-[#25d366]" /> WINGA
            </h1>
            <p className="text-[11px] text-white/50">The marketplace — post, bid and buy</p>
          </div>
          {myListings.length > 0 && (
            <button
              type="button"
              onClick={openStats}
              className="rounded-full p-2 hover:bg-white/10 transition-colors"
              title="Your listing stats"
              aria-label="Stats"
            >
              <BarChart3 size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={openBell}
            className="relative rounded-full p-2 hover:bg-white/10 transition-colors"
            title="WINGA Notifications"
            aria-label="WINGA Notifications"
            data-testid="winga-bell"
          >
            <Bell size={20} />
            {wingaOrders.some((o) => (o.isSeller && o.status === 'pending') || (o.isBuyer && (o.status === 'confirmed' || o.status === 'completed'))) && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#25d366] px-1 text-[9px] font-black text-[#0b141a]">
                {wingaOrders.filter((o) => (o.isSeller && o.status === 'pending') || (o.isBuyer && (o.status === 'confirmed' || o.status === 'completed'))).length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={openOrders}
            className="relative rounded-full p-2 hover:bg-white/10 transition-colors"
            title="Orders"
            aria-label="Orders"
          >
            <ClipboardList size={20} />
            {wingaOrders.filter((o) => o.isSeller && o.status === 'pending').length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-400 px-1 text-[9px] font-black text-[#0b141a]">
                {wingaOrders.filter((o) => o.isSeller && o.status === 'pending').length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowPost(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#008069] hover:bg-[#00a884] px-4 py-2 text-sm font-bold transition-colors"
          >
            <Plus size={18} /> Post
          </button>
        </div>
        <div className="flex items-center gap-2 px-4 pb-2">
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-semibold text-white/70">
            Today: {postedToday}/{dailyLimit} listings
          </span>
          {remainingToday <= 3 && (
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[11px] font-semibold text-amber-400">
              {remainingToday === 0 ? 'Kikomo kimefikiwa — subiri masaa 24' : `Zimesalia: ${remainingToday}`}
            </span>
          )}
        </div>
      </header>

      <main className="p-4 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/50 gap-3">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Loading WINGA...</p>
          </div>
        ) : view === 'categories' ? (
          <>
            {/* Total unseen banner */}
            {totalUnseen > 0 && (
              <button
                type="button"
                onClick={() => {
                  const firstWithUnseen = categories.find((c) => c.unseen > 0);
                  if (firstWithUnseen) openCategory(firstWithUnseen.id);
                }}
                className="mb-4 w-full flex items-center justify-between rounded-xl border border-[#25d366]/30 bg-[#25d366]/10 px-4 py-3 transition hover:bg-[#25d366]/15"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[#25d366]">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25d366] opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#25d366]" />
                  </span>
                  You have {totalUnseen} new listings you haven't seen
                </span>
                <span className="rounded-full bg-[#25d366] text-[#0b141a] text-xs font-black px-2.5 py-0.5">
                  {totalUnseen}
                </span>
              </button>
            )}

            {/* Search across all categories */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings (e.g. phones, bags, plots)..."
                data-testid="winga-search"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-8 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-white/10"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchQuery.trim() ? (
              <CategoryView
                activeCategory="__search"
                categories={[{
                  id: '__search',
                  label: `Results for "${searchQuery.trim()}"`,
                  count: searchResults.length,
                  unseen: 0,
                  listings: searchResults
                }]}
                renderMedia={renderMedia}
                openListing={openListing}
                chatWithSeller={chatWithSeller}
                user={user}
                categoryMeta={categoryMeta}
                formatPrice={formatPrice}
                openOrderModal={openOrderModal}              />
            ) : (
            <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat) => {
                const meta = categoryMeta(cat.id);
                const Icon = meta.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`winga-category-${cat.id}`}
                    onClick={() => openCategory(cat.id)}
                    className="relative flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 text-left transition hover:border-[#25d366]/40 hover:bg-white/10"
                  >
                    {cat.unseen > 0 && (
                      <span
                        data-testid={`winga-cat-unseen-${cat.id}`}
                        className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] flex items-center justify-center rounded-full bg-[#25d366] text-[#0b141a] text-xs font-black px-1.5 shadow-lg"
                      >
                        {cat.unseen}
                      </span>
                    )}
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.unseen > 0 ? 'bg-[#25d366]/20 text-[#25d366]' : 'bg-white/10 text-white/80'}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{meta.label}</p>
                      <p className="text-[11px] text-white/50">
                        {cat.count} {cat.count === 1 ? 'listing' : 'listings'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* My listings */}
            {myListings.length > 0 && (
              <section className="mt-8">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white/80">
                  <CheckCircle2 size={16} className="text-[#25d366]" /> My listings ({myListings.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {myListings.map((listing) => (
                    <div key={listing._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                      <button type="button" onClick={() => openListing(listing)} className="block w-full">
                        {renderMedia(listing, 'w-full h-36 object-cover')}
                      </button>
                      <div className="p-3">
                        <p className="truncate text-sm font-bold">{listing.title}</p>
                        <p className="mt-0.5 truncate text-xs font-semibold text-[#25d366]">{formatPrice(listing)}</p>
                        <p className="mt-0.5 text-[10px] text-white/40">{categoryMeta(listing.category).label}</p>
                        {listing.expiresAt && (
                          <p className="mt-0.5 text-[10px] text-amber-400/80">
                            Inaisha: {new Date(listing.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                        <div className="mt-2 flex gap-1.5">
                          <button
                            type="button"
                            data-testid="winga-toggle-sold"
                            onClick={() => toggleWingaSold(listing._id)}
                            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${listing.isSold ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'}`}
                          >
                            <CheckCircle2 size={12} /> {listing.isSold ? 'Back to Market' : 'Sold'}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMyListing(listing)}
                            className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            </>
            )}
            </>
        ) : (
          <CategoryView
            activeCategory={activeCategory}
            categories={categories}
            renderMedia={renderMedia}
            openListing={openListing}
            chatWithSeller={chatWithSeller}
            user={user}
            categoryMeta={categoryMeta}
            formatPrice={formatPrice}
            openOrderModal={openOrderModal}
          />
        )}
      </main>

      {/* ── Listing viewer modal ── */}
      {viewerListing && (
        <ListingViewer
          listing={viewerListing}
          onClose={() => setViewerListing(null)}
          mediaIndex={mediaIndex}
          setMediaIndex={setMediaIndex}
          chatWithSeller={chatWithSeller}
          user={user}
          formatPrice={formatPrice}
          onRate={openRateModal}
          onBuy={openOrderModal}
        />
      )}

      {/* ── Rating / reviews modal ── */}
      {/* z-[900] — opens ON TOP of the orders modal (z-[800]); a same-z later-in-DOM sibling would let the orders backdrop swallow star clicks */}
      {rateTarget && (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setRateTarget(null)}>
          <div
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111b21]/95 px-4 py-3 backdrop-blur">
              <h2 className="flex items-center gap-2 font-bold"><Star size={16} className="fill-amber-400 text-amber-400" /> Business Rating</h2>
              <button type="button" onClick={() => setRateTarget(null)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <p className="truncate text-sm font-bold">{rateTarget.title}</p>
                <p className="text-xs text-white/50">{categoryLabel(rateTarget.category)} · {formatPrice(rateTarget)}</p>
              </div>

              <div className="flex flex-col items-center gap-2 py-2">
                <p className="text-sm font-semibold text-white/80">Interested in this listing?</p>
                <StarRating value={myRating} size={30} onChange={setMyRating} />
                <p className="text-xs text-white/40">{myRating > 0 ? `${myRating} out of 5` : 'Tap a star to rate'}</p>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Your feedback (optional)</label>
                <textarea
                  value={rateComment}
                  onChange={(e) => setRateComment(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Eleza uzoefu wako na muuzaji..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
                />
              </div>

              <button
                type="button"
                data-testid="winga-submit-rating"
                onClick={submitRating}
                disabled={rateSaving || myRating < 1}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-[#14122b] transition hover:bg-amber-400 disabled:opacity-50"
              >
                {rateSaving ? <Loader2 size={18} className="animate-spin" /> : <Star size={18} className="fill-[#14122b]" />}
                {rateSaving ? 'Submitting...' : 'Submit Rating'}
              </button>

              {reviewsList.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <p className="mb-2 text-xs font-bold text-white/60">Buyer reviews ({reviewsList.length})</p>
                  <div className="space-y-2.5">
                    {reviewsList.map((r) => (
                      <div key={r._id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-bold text-white/80">
                            {r.username}{r.mine ? ' (wewe)' : ''}
                          </p>
                          <StarRating value={r.rating} size={11} />
                        </div>
                        {r.comment && <p className="mt-1 text-xs leading-relaxed text-white/60">{r.comment}</p>}
                        <p className="mt-1 text-[10px] text-white/30">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Post modal ── */}
      {showPost && (
        <div className="fixed inset-0 z-[600] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#111b21]/95 px-4 py-3 backdrop-blur">
              <h2 className="flex items-center gap-2 font-bold"><Store size={18} className="text-[#25d366]" /> Post a Listing</h2>
              <button type="button" onClick={() => setShowPost(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Listing category *</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CATEGORY_META.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      data-testid={`post-category-${c.id}`}
                      onClick={() => setPostCategory(c.id)}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-semibold transition ${
                        postCategory === c.id
                          ? 'border-[#25d366] bg-[#25d366]/15 text-[#25d366]'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg leading-none">{CATEGORY_EMOJI[c.id]}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Picha / Video * (max 10)</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-white/60 hover:border-[#25d366]/50 hover:text-white/80 transition"
                >
                  <Camera size={18} /> Choose photos or videos for your listing
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                />
                {postMedia.length > 0 && (
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {postMedia.map((m, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
                        {m.type === 'video' ? (
                          <video src={resolveMediaPlaybackUrl(m.url)} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={resolveMediaPlaybackUrl(m.url)} alt="" className="h-full w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setPostMedia((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white hover:bg-red-500"
                          aria-label="Remove media"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Listing name *</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  maxLength={200}
                  placeholder="E.g., Leather bag, iPhone 12, Plots..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Maelezo</label>
                <textarea
                  value={postDesc}
                  onChange={(e) => setPostDesc(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Describe your listing — condition, color, specs, etc."
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-white/70">Price (TZS)</label>
                  <input
                    type="number"
                    value={postPrice}
                    onChange={(e) => setPostPrice(e.target.value)}
                    placeholder="250,000"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-white/70">Mahali</label>
                  <input
                    type="text"
                    value={postLocation}
                    onChange={(e) => setPostLocation(e.target.value)}
                    placeholder="Dar es Salaam"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#25d366]/60"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <span className="text-xs text-white/60">Umbali leo</span>
                <span className={`text-xs font-bold ${remainingToday === 0 ? 'text-amber-400' : 'text-[#25d366]'}`}>
                  {postedToday}/{dailyLimit} zilizochapishwa
                </span>
              </div>

              <button
                type="button"
                data-testid="winga-submit-post"
                onClick={submitListing}
                disabled={posting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#008069] py-3 font-bold text-white transition hover:bg-[#00a884] disabled:opacity-50"
              >
                {posting ? <Loader2 size={18} className="animate-spin" /> : <Tag size={18} />}
                {posting ? 'Posting...' : 'Post Listing on WINGA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order / booking modal ── */}
      {orderTarget && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setOrderTarget(null)}>
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 font-bold"><ShoppingCart size={16} className="text-amber-400" /> Buy Listing</h2>
              <button type="button" onClick={() => setOrderTarget(null)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                {orderTarget.media?.[0]?.url ? (
                  <img src={resolveMediaPlaybackUrl(orderTarget.media[0].url)} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#008069]"><Store size={20} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{orderTarget.title}</p>
                  <p className="text-xs font-black text-[#25d366]">{formatPrice(orderTarget)}</p>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Idadi (quantity)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 font-black hover:bg-white/10"
                    aria-label="Punguza idadi"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-black">{orderQty}</span>
                  <button
                    type="button"
                    onClick={() => setOrderQty((q) => Math.min(100, q + 1))}
                    className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 font-black hover:bg-white/10"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-white/70">Message to seller (optional)</label>
                <textarea
                  value={orderMsg}
                  onChange={(e) => setOrderMsg(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="E.g., Is there another color? Where can I find you?"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-amber-400/60"
                />
              </div>

              <button
                type="button"
                data-testid="winga-submit-order"
                onClick={submitOrder}
                disabled={orderSaving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 font-bold text-[#14122b] transition hover:bg-amber-400 disabled:opacity-50"
              >
                {orderSaving ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                {orderSaving ? 'Submitting request...' : 'Submit Purchase Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Orders modal (received + sent) ── */}
      {showOrders && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowOrders(false)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 font-bold"><ClipboardList size={16} className="text-amber-400" /> Orders</h2>
              <button type="button" onClick={() => setShowOrders(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex border-b border-white/10">
              {['received', 'sent'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setOrdersTab(tab)}
                  className={`flex-1 py-2.5 text-sm font-bold transition ${ordersTab === tab ? 'border-b-2 border-amber-400 text-amber-400' : 'text-white/40 hover:text-white/70'}`}
                >
                  {tab === 'received' ? `Received (${wingaOrders.filter((o) => o.isSeller).length})` : `Sent (${wingaOrders.filter((o) => o.isBuyer).length})`}
                </button>
              ))}
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2.5">
              {wingaOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/40">No orders yet</p>
              ) : wingaOrders.filter((o) => (ordersTab === 'received' ? o.isSeller : o.isBuyer)).length === 0 ? (
                <p className="py-10 text-center text-sm text-white/40">
                  {ordersTab === 'received' ? 'No orders received yet' : 'No orders sent yet'}
                </p>
              ) : (
                wingaOrders.filter((o) => (ordersTab === 'received' ? o.isSeller : o.isBuyer)).map((o) => (
                  <div key={o._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-start gap-3">
                      {o.listingImage ? (
                        <img src={resolveMediaPlaybackUrl(o.listingImage)} alt="" className="h-11 w-11 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#008069]"><Store size={18} /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{o.listingTitle}</p>
                        <p className="text-xs text-white/50">
                          {o.isSeller ? `Kutoka: ${o.buyerUsername}` : `Kwa: ${o.sellerUsername}`} · <span className="font-black text-[#25d366]">{o.listingPriceText || (o.listingPrice ? `TZS ${Number(o.listingPrice).toLocaleString()}` : 'Jadiliana')}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">Idadi: {o.quantity} · {new Date(o.createdAt).toLocaleString()}</p>
                        {o.message && <p className="mt-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/60">"{o.message}"</p>}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        o.status === 'pending' ? 'bg-amber-400/15 text-amber-400' :
                        o.status === 'confirmed' ? 'bg-emerald-400/15 text-emerald-400' :
                        o.status === 'completed' ? 'bg-sky-400/15 text-sky-400' :
                        o.status === 'declined' ? 'bg-red-400/15 text-red-400' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {o.status === 'pending' ? 'Inasubiri' : o.status === 'confirmed' ? 'Imethibitishwa ✅' : o.status === 'completed' ? 'Imekamilika ✅' : o.status === 'declined' ? 'Imekataliwa' : 'Imeghairiwa'}
                      </span>
                      {o.status === 'pending' && o.isSeller && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            data-testid="winga-order-confirm"
                            onClick={() => setOrderStatus(o._id, 'confirmed')}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-[#0b141a] transition hover:bg-emerald-400"
                          >
                            <Check size={12} /> Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderStatus(o._id, 'declined')}
                            className="flex items-center gap-1 rounded-lg bg-red-500/80 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-red-500"
                          >
                            <XCircle size={12} /> Kataa
                          </button>
                        </div>
                      )}
                      {o.status === 'pending' && o.isBuyer && (
                        <button
                          type="button"
                          onClick={() => setOrderStatus(o._id, 'cancelled')}
                          className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-white/70 transition hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      )}
                      {o.status === 'confirmed' && o.isBuyer && (
                        <button
                          type="button"
                          data-testid="winga-order-complete"
                          onClick={() => markOrderCompleted(o._id)}
                          className="flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-sky-400"
                        >
                          <PackageCheck size={12} /> Received
                        </button>
                      )}
                      {o.status === 'completed' && (
                        <button
                          type="button"
                          data-testid="winga-order-rate"
                          onClick={() => openRateModal({
                            _id: o.listing,
                            title: o.listingTitle || 'Business',
                            category: o.category || 'other',
                            price: o.listingPrice || 0,
                            priceText: o.listingPriceText || '',
                            media: o.listingImage ? [{ url: o.listingImage, type: 'image' }] : []
                          })}
                          className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-bold text-[#14122b] transition hover:bg-amber-400"
                        >
                          <Star size={12} className="fill-[#14122b]" /> Toa Rating
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bell notifications modal ── */}
      {showBell && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowBell(false)}>
          <div
            className="w-full max-w-md max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 font-bold"><Bell size={16} className="text-[#25d366]" /> WINGA Notifications</h2>
              <button type="button" onClick={() => setShowBell(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-4 space-y-2.5">
              {wingaOrders.length === 0 ? (
                <p className="py-10 text-center text-sm text-white/40">No notifications yet — orders will appear here</p>
              ) : (
                wingaOrders.map((o) => {
                  const isSellerAlert = o.isSeller && (o.status === 'pending' || o.status === 'completed');
                  const isBuyerAlert = o.isBuyer && ['confirmed', 'completed', 'declined', 'cancelled'].includes(o.status);
                  if (!isSellerAlert && !isBuyerAlert) return null;
                  const msg = o.isSeller
                    ? (o.status === 'pending' ? `Purchase request from ${o.buyerUsername}` : `${o.buyerUsername} received the item`)
                    : (o.status === 'confirmed' ? 'Seller confirmed your order' : o.status === 'completed' ? 'Your order is complete — leave a rating!' : o.status === 'declined' ? 'Seller declined your order' : 'You cancelled your order');
                  return (
                    <div key={o._id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                      {o.listingImage ? (
                        <img src={resolveMediaPlaybackUrl(o.listingImage)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#008069]"><Store size={16} /></span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold">{o.listingTitle}</p>
                        <p className="truncate text-[11px] text-white/50">{msg}</p>
                        <p className="mt-0.5 text-[10px] text-white/30">{new Date(o.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black ${
                        o.status === 'pending' ? 'bg-amber-400/15 text-amber-400' :
                        o.status === 'completed' ? 'bg-sky-400/15 text-sky-400' :
                        o.status === 'confirmed' ? 'bg-emerald-400/15 text-emerald-400' :
                        o.status === 'declined' ? 'bg-red-400/15 text-red-400' :
                        'bg-white/10 text-white/40'
                      }`}>
                        {o.status === 'pending' ? 'PENDING' : o.status === 'completed' ? 'KAMILI' : o.status === 'confirmed' ? 'THIBITISHWA' : o.status === 'declined' ? 'KATAA' : 'GHAIRI'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => { setShowBell(false); openOrders(); }}
                className="w-full rounded-xl bg-[#008069] py-2.5 text-sm font-bold text-white transition hover:bg-[#00a884]"
              >
                Open Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Seller analytics / stats modal ── */}
      {(statsLoading || statsData) && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setStatsData(null)}>
          <div
            className="w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="flex items-center gap-2 font-bold"><BarChart3 size={16} className="text-[#25d366]" /> Listing Stats</h2>
              <button type="button" onClick={() => setStatsData(null)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {statsLoading ? (
              <div className="flex flex-col items-center gap-3 py-16 text-white/50">
                <Loader2 size={26} className="animate-spin" />
                <p className="text-sm">Loading stats...</p>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['Business', statsData?.totals?.listings || 0],
                    ['Maoni (views)', statsData?.totals?.views || 0],
                    ['Orders', statsData?.totals?.orders || 0],
                    ['Wastani rating', statsData?.totals?.avgRating || 0]
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-center">
                      <p className="text-lg font-black text-[#25d366]">{val}</p>
                      <p className="text-[10px] text-white/40">{label}</p>
                    </div>
                  ))}
                </div>
                {statsData?.stats?.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/40">No listings yet — post one first</p>
                ) : (
                  <div className="space-y-2">
                    {statsData?.stats?.map((row) => (
                      <div key={row.listing._id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                        {row.listing.media?.[0]?.url ? (
                          <img src={resolveMediaPlaybackUrl(row.listing.media[0].url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#008069]"><Store size={16} /></span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{row.listing.title}</p>
                          <p className="flex items-center gap-2 text-[11px] text-white/40">
                            <span className="flex items-center gap-0.5"><Eye size={11} /> {row.viewsCount}</span>
                            <span>·</span>
                            <span>{row.ratingSummary.count > 0 ? `${row.ratingSummary.avg}⭐ (${row.ratingSummary.count})` : 'No ratings'}</span>
                            <span>·</span>
                            <span className={row.orders.pending > 0 ? 'font-bold text-amber-400' : ''}>{row.orders.total} orders{row.orders.pending > 0 ? ` (${row.orders.pending} pending)` : ''}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryView = ({ activeCategory, categories, renderMedia, openListing, chatWithSeller, user, categoryMeta, formatPrice, openOrderModal }) => {
  const cat = categories.find((c) => c.id === activeCategory);
  if (!cat) return null;
  const meta = categoryMeta(cat.id);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="text-2xl">{CATEGORY_EMOJI[cat.id]}</span> {cat.label || meta.label}
          {cat.unseen > 0 && (
            <span className="rounded-full bg-[#25d366] px-2 py-0.5 text-xs font-black text-[#0b141a]">
              {cat.unseen} new
            </span>
          )}
        </h2>
        <span className="text-xs text-white/50">{cat.count} listings</span>
      </div>

      {cat.listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 text-center">
          <Store size={40} className="mb-3 text-white/30" />
          <p className="font-semibold text-white/70">No listings yet in this category</p>
          <p className="mt-1 text-sm text-white/40">Be the first to post your listing!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {cat.listings.map((listing) => {
            const isMine = String(listing.user?._id || listing.userId) === String(user?._id || user?.id);
            return (
              <div
                key={listing._id}
                data-testid="winga-listing-card"
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md transition hover:border-[#25d366]/40"
              >
                <button type="button" onClick={() => openListing(listing)} className="relative block w-full">
                  {renderMedia(listing, 'w-full h-40 object-cover')}
                  {!listing.viewedByMe && !isMine && !listing.isSold && (
                    <span className="absolute top-2 left-2 rounded-full bg-[#25d366] px-2 py-0.5 text-[10px] font-black text-[#0b141a]">
                      NEW
                    </span>
                  )}
                  {listing.isSold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
                      <span className="rounded-lg border border-amber-400/50 bg-amber-500/20 px-4 py-1.5 text-sm font-black tracking-wide text-amber-300">
                        IMEUZWA
                      </span>
                    </div>
                  )}
                </button>
                <div className="p-3">
                  <p className="truncate text-sm font-bold">{listing.title}</p>
                  <p className="mt-0.5 truncate text-sm font-black text-[#25d366]">{formatPrice(listing)}</p>
                  <div className="mt-1">
                    <RatingSummary rating={listing.ratingSummary} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    {listing.user?.profilePicture ? (
                      <img src={listing.user.profilePicture} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#008069] text-[9px] font-bold">
                        {(listing.user?.username || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-[11px] text-white/50">{listing.user?.username}</span>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    {!isMine && !listing.isSold && (
                      <button
                        type="button"
                        data-testid="winga-buy-button"
                        onClick={(e) => { e.stopPropagation(); openOrderModal(listing); }}
                        className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-amber-500 py-2 text-xs font-bold text-[#14122b] transition hover:bg-amber-400"
                      >
                        <ShoppingCart size={13} /> Buy
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="winga-chat-button"
                      onClick={(e) => { e.stopPropagation(); chatWithSeller(listing.user?._id || listing.userId, listing.user?.username); }}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#008069] py-2 text-xs font-bold text-white transition hover:bg-[#00a884] ${isMine ? 'w-full' : ''}`}
                    >
                      <MessageCircle size={14} /> {isMine ? 'My listing' : 'Chat with Seller'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

const ListingViewer = ({ listing, onClose, mediaIndex, setMediaIndex, chatWithSeller, user, formatPrice, onRate, onBuy }) => {
  const media = listing.media || [];
  const isMine = String(listing.user?._id || listing.userId) === String(user?._id || user?.id);
  const current = media[mediaIndex];

  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#111b21] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          {current ? (
            current.type === 'video' ? (
              <video src={resolveMediaPlaybackUrl(current.url)} controls autoPlay className="max-h-[50vh] w-full object-contain bg-black" />
            ) : (
              <img src={resolveMediaPlaybackUrl(current.url)} alt={listing.title} className="max-h-[50vh] w-full object-contain bg-black" />
            )
          ) : (
            <div className="flex h-56 items-center justify-center bg-gradient-to-br from-[#075E54] to-[#128C7E]">
              <Store size={48} className="text-white/60" />
            </div>
          )}
          {media.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {media.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMediaIndex(i)}
                  className={`h-2 rounded-full transition-all ${i === mediaIndex ? 'w-6 bg-[#25d366]' : 'w-2 bg-white/40'}`}
                  aria-label={`Media ${i + 1}`}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[#25d366]">{CATEGORY_EMOJI[listing.category]} {categoryLabel(listing.category)}</p>
              <h2 className="mt-1 text-xl font-black">{listing.title}</h2>
            </div>
            <p className="shrink-0 rounded-xl bg-[#25d366]/15 border border-[#25d366]/30 px-3 py-1.5 text-base font-black text-[#25d366]">
              {formatPrice(listing)}
            </p>
          </div>

          {listing.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/70">{listing.description}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <RatingSummary rating={listing.ratingSummary} />
            {!isMine && (
              <button
                type="button"
                data-testid="winga-rate-button"
                onClick={() => onRate && onRate(listing)}
                className="flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
              >
                <Star size={12} className="fill-amber-400 text-amber-400" /> Rating
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            {listing.user?.profilePicture ? (
              <img src={listing.user.profilePicture} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#008069] font-bold">
                {(listing.user?.username || '?').charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{listing.user?.username}</p>
              <p className="text-[11px] text-white/40">
                {listing.location ? `📍 ${listing.location} · ` : ''}
                {new Date(listing.createdAt).toLocaleDateString()}
              </p>
            </div>
            {!isMine && (
              <div className="flex gap-1.5">
                {!listing.isSold && (
                  <button
                    type="button"
                    data-testid="winga-viewer-buy"
                    onClick={() => onBuy && onBuy(listing)}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-[#14122b] transition hover:bg-amber-400"
                  >
                    <ShoppingCart size={16} /> Buy
                  </button>
                )}
                <button
                  type="button"
                  data-testid="winga-viewer-chat"
                  onClick={() => chatWithSeller(listing.user?._id || listing.userId, listing.user?.username)}
                  className="flex items-center gap-1.5 rounded-xl bg-[#008069] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#00a884]"
                >
                  <MessageCircle size={16} /> Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const categoryLabel = (id) => {
  const meta = CATEGORY_META.find((c) => c.id === id);
  return meta ? meta.label : id;
};

export default Winga;
