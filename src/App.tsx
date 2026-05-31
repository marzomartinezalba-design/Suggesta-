/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ArrowLeft, Star, User, Plus, Loader2, X, MessageSquare, Music, Play } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { AppState, BaseItem, Review, Recommendation, ItemType, UserProfile } from './types';
import { dataService } from './services/dataService';
import { auth, loginWithGoogle, logout as firebaseLogout } from './lib/firebase';
import { generateItemInfo, searchItemsAI, generateCommunityReviews, generateCommunityRecommendations, getBackendUrl } from './services/geminiService';
const SuggestaLogo = ({ className, size = 24 }: { className?: string; size?: number }) => (
  <svg 
    viewBox="0 0 100 100" 
    width={size} 
    height={size} 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Left-back soft star */}
    <path 
      d="M 38 20 Q 38 48 10 48 Q 38 48 38 76 Q 38 48 66 48 Q 38 48 38 20" 
      fill="#dbf6ce" 
    />
    {/* Right-front vibrant star */}
    <path 
      d="M 62 24 Q 62 58 28 58 Q 62 58 62 92 Q 62 58 96 58 Q 62 58 62 24" 
      fill="#bfecac" 
    />
  </svg>
);

const ImageWithFallback = ({ 
  src, 
  alt, 
  type, 
  title, 
  creator, 
  className,
  showDetails = false
}: { 
  src?: string; 
  alt: string; 
  type: string; 
  title?: string; 
  creator?: string; 
  className?: string; 
  showDetails?: boolean;
}) => {
  const resolvedTitle = title || alt || 'Untitled';
  const resolvedCreator = creator || (type === 'music' ? 'Curated Artist' : 'Curated Film');

  const [errorCount, setErrorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const hash = useMemo(() => {
    let h = 0;
    const key = resolvedTitle;
    for (let i = 0; i < key.length; i++) {
      h = key.charCodeAt(i) + ((h << 5) - h);
    }
    return Math.abs(h);
  }, [resolvedTitle]);

  const isMusic = type === 'music';

  // Build high-relevance search query for Unsplash targeting poster/cover art instead of actors
  const targetImageUrl = useMemo(() => {
    const cleanTitle = resolvedTitle.replace(/[^\w\s-]/gi, '').trim();
    const cleanCreator = resolvedCreator.replace(/[^\w\s-]/gi, '').trim();
    if (isMusic) {
      return `https://images.unsplash.com/featured/400x400/?music,album,vinyl,cover,${encodeURIComponent(cleanTitle + ' ' + cleanCreator)}`;
    } else {
      return `https://images.unsplash.com/featured/400x600/?movie,cinema,poster,film,${encodeURIComponent(cleanTitle)}`;
    }
  }, [resolvedTitle, resolvedCreator, isMusic]);

  const currentSrc = useMemo(() => {
    if (errorCount === 0 && src) {
      return src;
    }

    if (errorCount <= 1) {
      return targetImageUrl;
    }

    return isMusic
      ? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=400'
      : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400';
  }, [src, targetImageUrl, errorCount, isMusic]);

  return (
    <div 
      className={`relative w-full rounded-xl overflow-hidden shadow-xl border border-neutral-800/80 bg-[#121214] select-none group/card flex flex-col justify-end transition-all ${className || ''}`}
      style={{
        aspectRatio: isMusic ? '1/1' : '2/3'
      }}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center z-10">
          <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
        </div>
      )}

      {/* Album/Poster Image */}
      <img 
        src={currentSrc} 
        alt={resolvedTitle} 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setErrorCount(prev => prev + 1);
          setIsLoading(false);
        }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {/* Cinematic gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10 opacity-75 group-hover/card:opacity-85 transition-opacity duration-300 pointer-events-none" />

      {/* Details overlay bar */}
      {showDetails && (
        <div className="relative z-10 p-3.5 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5 opacity-90">
            {isMusic ? (
              <span className="flex items-center justify-center p-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Music className="w-2.5 h-2.5 text-emerald-400" />
              </span>
            ) : (
              <span className="flex items-center justify-center p-1 rounded-full bg-amber-500/15 border border-amber-500/30">
                <Play className="w-2.5 h-2.5 text-amber-400 fill-amber-400 translate-x-[0.2px]" />
              </span>
            )}
            <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-300 font-mono">
              {isMusic ? 'Song Track' : 'Feature Film'}
            </span>
          </div>

          <h4 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-1 drop-shadow-md">
            {resolvedTitle}
          </h4>
          <span className="text-xs text-neutral-300 font-medium line-clamp-1 drop-shadow-sm">
            {resolvedCreator}
          </span>
        </div>
      )}

      {/* Subtle hover overlay accent light */}
      <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<AppState>({
    currentPage: 'home',
    searchQuery: '',
  });

  const [searchResults, setSearchResults] = useState<BaseItem[]>([]);
  const [lastPage, setLastPage] = useState<'home' | 'search' | 'profile'>('home');
  const [selectedItem, setSelectedItem] = useState<BaseItem | null>(null);
  const [itemReviews, setItemReviews] = useState<Review[]>([]);
  const [itemRecs, setItemRecs] = useState<Recommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);
  
  // Auth & Global Data State
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [allRecs, setAllRecs] = useState<Recommendation[]>([]);
  const [storedItems, setStoredItems] = useState<BaseItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: 'Culture Curator', avatarUrl: '', isAuthenticated: false });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<UserProfile>(userProfile);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    // 1. Auth Subscription
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile = await dataService.getProfile(user.uid);
        setUserProfile({ ...profile, isAuthenticated: true });
      } else {
        setUserProfile({ name: 'Culture Curator', avatarUrl: '', isAuthenticated: false });
      }
    });

    // 2. Real-time Data Subscriptions (MUCH FASTER than manual fetching)
    const unsubItems = dataService.subscribeToItems(setStoredItems);
    const unsubReviews = dataService.subscribeToReviews(setAllReviews);
    const unsubRecs = dataService.subscribeToRecommendations(setAllRecs);

    return () => {
      unsubAuth();
      unsubItems();
      unsubReviews();
      unsubRecs();
    };
  }, []);

  // Sync edit form with profile updates
  useEffect(() => {
    setEditProfileForm(userProfile);
  }, [userProfile]);

  // Performance Optimization: Memoized Feed
  const communityFeed = useMemo(() => {
    const combined = [
      ...allReviews.map(o => ({ ...o, feedType: 'Opinion' })),
      ...allRecs.map(o => ({ ...o, feedType: 'Suggestion', comment: (o as any).reason || '' }))
    ];
    return combined
      .sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0;
        return timeB - timeA;
      })
      .slice(0, 6);
  }, [allReviews, allRecs]);

  const userReviews = useMemo(() => 
    allReviews.filter(r => r.userId === auth.currentUser?.uid).sort((a, b) => b.createdAt - a.createdAt),
    [allReviews, auth.currentUser?.uid]
  );

  const userRecs = useMemo(() => 
    allRecs.filter(r => r.userId === auth.currentUser?.uid).sort((a, b) => b.createdAt - a.createdAt),
    [allRecs, auth.currentUser?.uid]
  );
  
  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRecModal, setShowRecModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Login Form State
  const [loginForm, setLoginForm] = useState({ name: '', avatarUrl: '' });
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', userName: '' });
  const [newRec, setNewRec] = useState({ title: '', type: 'music' as ItemType, reason: '', userName: '' });
  const [recPreview, setRecPreview] = useState<BaseItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const fetchRecPreview = async () => {
    if (!newRec.title.trim()) return;
    setIsPreviewLoading(true);
    setRecPreview(null);
    try {
      const item = await generateItemInfo(newRec.title, newRec.type);
      setRecPreview(item);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!state.searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    setSearchResults([]); 
    setState(prev => ({ ...prev, currentPage: 'search' })); 
    
    // Check cache/local first
    const query = state.searchQuery.toLowerCase();
    const localResults = storedItems.filter(item => 
      item.title.toLowerCase().includes(query) ||
      item.creator.toLowerCase().includes(query)
    );
    
    if (localResults.length > 0) {
      setSearchResults(localResults);
    }

    try {
      const aiResults = await searchItemsAI(state.searchQuery);
      if (aiResults && aiResults.length > 0) {
        if (auth.currentUser) {
          Promise.all(aiResults.map(item => 
            dataService.saveItem(item).catch(err => console.warn("Background save failed:", err))
          ));
        }

        setSearchResults(aiResults);
      }
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectItem = async (item: BaseItem) => {
    if (state.currentPage !== 'detail') {
      setLastPage(state.currentPage);
    }
    setSelectedItem(item);
    
    // Instant lookup from subscribed collections
    const existingReviews = allReviews.filter(r => r.itemId === item.id);
    const existingRecs = allRecs.filter(r => r.sourceItemId === item.id);
    
    setItemReviews(existingReviews);
    setItemRecs(existingRecs);
    setReviewsLoading(existingReviews.length === 0);
    setRecsLoading(existingRecs.length === 0);
    setState(prev => ({ ...prev, currentPage: 'detail', selectedItemId: item.id }));
    window.scrollTo({ top: 0, behavior: 'instant' as any });

    // Background generation if content is sparse
    if (existingReviews.length === 0) {
      generateCommunityReviews(item).then(communityReviews => {
        const reviewsWithIds: Review[] = communityReviews.map(r => ({
          ...r,
          id: `ai-${Math.random().toString(36).substr(2, 9)}`,
          itemId: item.id,
          userId: 'system-ai',
          createdAt: Date.now() - Math.floor(Math.random() * 1000000000)
        }));
        setItemReviews(reviewsWithIds);
        setReviewsLoading(false);
      }).catch(() => setReviewsLoading(false));
    }

    if (existingRecs.length === 0) {
      generateCommunityRecommendations(item).then(communityRecs => {
        if (communityRecs && communityRecs.length > 0) {
          const recsWithUserIds = communityRecs.map(r => ({ ...r, userId: 'system-ai' }));
          setItemRecs(recsWithUserIds);
        }
        setRecsLoading(false);
      }).catch(() => setRecsLoading(false));
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newReview.comment || !auth.currentUser) return;

    const review: Review = {
      id: Math.random().toString(36).substr(2, 9),
      itemId: selectedItem.id,
      userId: auth.currentUser.uid,
      userName: userProfile.name || auth.currentUser.displayName || 'Guest User',
      rating: newReview.rating,
      comment: newReview.comment,
      createdAt: Date.now()
    };

    await dataService.addReview(review);
    setItemReviews(prev => [review, ...prev]);
    setShowReviewModal(false);
    setNewReview({ rating: 5, comment: '', userName: '' });
  };

  const submitRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !newRec.title || !auth.currentUser) return;

    setIsSubmitting(true);
    
    let targetItem = recPreview;
    
    if (!targetItem) {
        const results = await dataService.searchItems(newRec.title);
        targetItem = results.find(i => i.title.toLowerCase() === newRec.title.toLowerCase()) || null;
        if (!targetItem) {
            targetItem = await generateItemInfo(newRec.title, newRec.type);
        }
    }

    if (targetItem) {
        await dataService.saveItem(targetItem);
        const rec: Recommendation = {
            id: Math.random().toString(36).substr(2, 9),
            sourceItemId: selectedItem.id,
            targetItem: targetItem,
            userId: auth.currentUser.uid,
            reason: newRec.reason,
            userName: userProfile.name || auth.currentUser.displayName || 'Guest User',
            createdAt: Date.now()
        };

        await dataService.addRecommendation(rec);
        setItemRecs(prev => [rec, ...prev]);
    }

    setIsSubmitting(false);
    setShowRecModal(false);
    setNewRec({ title: '', type: 'music', reason: '', userName: '' });
    setRecPreview(null);
  };

  const goHome = () => {
    setState({ currentPage: 'home', searchQuery: '' });
    setSelectedItem(null);
    setSearchResults([]); // CRITICAL: Clear results so Trends show up
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  const goBack = () => {
    setState(prev => ({ ...prev, currentPage: lastPage }));
    setSelectedItem(null);
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  const goProfile = () => {
    if (state.currentPage !== 'profile' && state.currentPage !== 'detail') {
      setLastPage(state.currentPage);
    }
    setState(prev => ({ ...prev, currentPage: 'profile' }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    const updated = { ...editProfileForm, isAuthenticated: true };
    await dataService.updateProfile(auth.currentUser.uid, updated);
    setUserProfile(updated);
    setIsEditingProfile(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use manual login for test/guest, but Google for real
    try {
      await loginWithGoogle();
      setShowLoginModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
    goHome();
  };

  const getSafeUrl = (url?: string, item?: BaseItem) => {
    if (!url) return undefined;

    // Resolve through play-video server proxy if we have metadata to guarantee working links
    if (item) {
      return `${getBackendUrl()}/api/play-video?title=${encodeURIComponent(item.title)}&creator=${encodeURIComponent(item.creator || '')}&type=${item.type}&originalUrl=${encodeURIComponent(url)}`;
    }

    const urlLower = url.toLowerCase();
    const isMock = 
      urlLower.includes('placeholder') || 
      urlLower.includes('template') || 
      urlLower.includes('your_') || 
      urlLower.includes('insert_id') || 
      urlLower.includes('xxxx') || 
      urlLower.includes('12345') || 
      urlLower.includes('abcde') ||
      urlLower.includes('dummy') ||
      urlLower.includes('fake_id') ||
      urlLower.includes('your_id');

    if (isMock) {
      return `https://www.youtube.com/results?search_query=official+trailer`;
    }

    if (url.startsWith('https://') || url.startsWith('http://')) return url;
    return `https://${url}`;
  };

  const getSafeMusicUrl = (item: BaseItem) => {
    const url = item.externalUrl || '';
    
    // Resolve through play-music server proxy to guarantee a playable YouTube Music link
    return `${getBackendUrl()}/api/play-music?title=${encodeURIComponent(item.title)}&creator=${encodeURIComponent(item.creator || '')}&originalUrl=${encodeURIComponent(url)}`;
  };

  return (
    <div className="min-h-screen bg-[#3b0a7a] text-white font-sans selection:bg-[#bfecac]/30">
      <AnimatePresence mode="wait">
        {state.currentPage === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 bg-dot-pattern"
          >
            {/* Profile Navigation */}
            <div className="fixed top-8 left-8 z-[60] flex gap-3">
               <motion.button 
                onClick={userProfile.isAuthenticated ? goProfile : () => setShowLoginModal(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 p-3 px-6 bg-white border border-gray-100 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl transition-all"
               >
                 <User size={14} className="text-black" />
                 {userProfile.isAuthenticated ? 'My Profile' : 'Sign In'}
               </motion.button>
            </div>
            


            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="text-center"
            >
              <h1 className="text-8xl md:text-[12rem] font-bold tracking-tighter mb-4 bg-gradient-to-br from-[#bfecac] via-[#bfecac] to-[#bfecac]/80 bg-clip-text text-transparent select-none">
                Suggesta
              </h1>
              <p className="text-white/60 font-medium tracking-[0.3em] uppercase text-xs mb-12">
                Discovery • Connection • Culture
              </p>
            </motion.div>
            
            <motion.form 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSearch}
              className="w-full max-w-2xl group"
            >
              <div className="relative flex items-center">
                <div className="absolute inset-0 bg-[#bfecac]/10 blur-3xl rounded-full scale-150 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <input
                  id="main-search"
                  type="text"
                  placeholder="Search a movie, song or series..."
                  autoComplete="off"
                  className="w-full h-18 pl-16 pr-22 rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-[#bfecac]/5 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 transition-all text-xl text-black relative z-10"
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#bfecac] transition-colors z-20" size={28} />
                <SuggestaLogo 
                  size={64} 
                  className="absolute right-5 z-20 pointer-events-none drop-shadow-sm"
                />
              </div>
              
              <div className="flex gap-4 justify-center mt-10 relative z-10">
                <button 
                  type="submit"
                  disabled={isSearching}
                  className="px-10 py-4 bg-[#bfecac] text-[#3b0a7a] rounded-xl font-bold hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
                >
                  {isSearching && <Loader2 className="animate-spin" size={20} />}
                  {isSearching ? 'Analyzing...' : 'Search Culture'}
                </button>
              </div>
            </motion.form>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="w-full max-w-5xl mt-24"
            >


              <div className="flex items-center justify-between mb-8 px-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-[#bfecac]/60">Community Trends</h3>
                <div className="flex gap-2">
                   <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-green-600 uppercase tracking-tight">Live Activity</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
                {communityFeed.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-medium">No community activity yet. Be the first to share!</p>
                  </div>
                ) : communityFeed.map((opinion, idx) => {
                  const isSuggestion = (opinion as any).feedType === 'Suggestion';
                  return (
                      <div key={(opinion as any).id || idx} className={`p-6 rounded-3xl border transition-all ${isSuggestion ? 'bg-[#bfecac] border-transparent shadow-lg shadow-[#bfecac]/20' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                        <div className="flex items-center gap-2 mb-3">
                           <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isSuggestion ? 'text-[#3b0a7a] bg-[#3b0a7a]/10' : 'text-[#bfecac] bg-[#bfecac]/10'}`}>
                             {(opinion as any).feedType}
                           </span>
                           <span className={`text-[9px] font-bold uppercase ${isSuggestion ? 'text-[#3b0a7a]/40' : 'text-gray-400'}`}>
                             {(() => {
                               const date = typeof opinion.createdAt === 'number' 
                                 ? new Date(opinion.createdAt) 
                                 : (opinion.createdAt as any)?.toDate 
                                   ? (opinion.createdAt as any).toDate() 
                                   : new Date();
                               return date.toLocaleDateString();
                             })()}
                           </span>
                        </div>
                        
                        {isSuggestion && (opinion as any).targetItem && (
                          <div className="flex items-center gap-4 mb-3 p-3 bg-[#3b0a7a]/5 rounded-2xl border border-black/5 relative group/spotify">
                             <div className="w-10 h-14 bg-[#3b0a7a]/10 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                <ImageWithFallback 
                                  src={(opinion as any).targetItem.imageUrl} 
                                  alt={(opinion as any).targetItem.title} 
                                  type={(opinion as any).targetItem.type} 
                                  title={(opinion as any).targetItem.title} 
                                  creator={(opinion as any).targetItem.creator} 
                                  className="w-full h-full object-cover" 
                                />
                             </div>
                             <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[10px] text-[#3b0a7a]/40 font-black uppercase tracking-widest mb-1 italic">Discover</p>
                                  <div className="flex gap-1">
                                    {(opinion as any).targetItem.type === 'music' && (opinion as any).targetItem.trailerUrl && (
                                      <a 
                                        href={getSafeUrl((opinion as any).targetItem.trailerUrl, (opinion as any).targetItem)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Watch Music Video"
                                        className="p-1 rounded-full bg-[#FF0000] text-white hover:scale-110 transition-transform shadow-sm"
                                      >
                                        <Play size={8} fill="currentColor" />
                                      </a>
                                    )}
                                    {(opinion as any).targetItem.type === 'music' && (opinion as any).targetItem.externalUrl && (
                                      <a 
                                        href={getSafeMusicUrl((opinion as any).targetItem)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Play on YouTube Music"
                                        className="p-1 rounded-full bg-[#FF0000] text-white hover:scale-110 transition-transform shadow-sm flex items-center justify-center"
                                      >
                                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
                                        </svg>
                                      </a>
                                    )}
                                  </div>
                              </div>
                              <h4 className="text-sm font-bold leading-tight text-[#3b0a7a]">{(opinion as any).targetItem.title}</h4>
                           </div>
                          </div>
                        )}

                        <p className={`text-sm italic leading-relaxed line-clamp-3 mb-4 ${isSuggestion ? 'text-[#3b0a7a] font-medium' : 'text-black'}`}>"{opinion.comment}"</p>
                        <div className="flex items-center gap-2">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold overflow-hidden ${isSuggestion ? 'bg-[#3b0a7a]/10 text-[#3b0a7a]' : 'bg-gray-100 text-gray-400'}`}>
                             {(opinion.userName || '?').charAt(0)}
                           </div>
                           <span className={`text-[10px] font-black uppercase tracking-tighter ${isSuggestion ? 'text-[#3b0a7a]/50' : 'text-gray-500'}`}>{opinion.userName || 'Anonymous'}</span>
                        </div>
                      </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {state.currentPage !== 'home' && (
          <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-8">
              <button 
                onClick={goHome}
                className="flex items-center gap-2 text-2xl font-black tracking-tighter hover:scale-105 transition-all"
              >
                <SuggestaLogo 
                  size={36} 
                  className="shrink-0"
                />
                <span className="bg-gradient-to-br from-[#bfecac] to-[#bfecac]/80 bg-clip-text text-transparent">
                  Suggesta
                </span>
              </button>
              
              <div className="flex-1 relative group max-w-xl flex items-center">
                <input
                  id="nav-search-v2"
                  type="text"
                  placeholder="Search something else..."
                  className="w-full h-11 pl-12 pr-14 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#bfecac]/30 focus:outline-none focus:ring-4 focus:ring-[#bfecac]/5 transition-all text-sm text-black relative z-10"
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#bfecac] transition-colors z-20" size={18} />
                <SuggestaLogo 
                  size={32} 
                  className="absolute right-3 z-20 pointer-events-none"
                />
              </div>

              <div className="flex items-center gap-4">
                {userProfile.isAuthenticated ? (
                  <button 
                    onClick={goProfile}
                    className="flex items-center gap-2 p-1 bg-white rounded-full border border-gray-100 pr-3 cursor-pointer"
                  >
                     <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                        <img 
                          src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                     </div>
                     <span className="hidden lg:inline text-[9px] font-black uppercase tracking-widest text-black/60">
                       Profile
                     </span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowLoginModal(true)}
                    className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-[#bfecac] hover:text-[#3b0a7a] transition-all active:scale-95"
                  >
                    Login
                  </button>
                )}
                
                <button 
                  onClick={goProfile}
                  className={`p-2 rounded-full transition-all ${state.currentPage === 'profile' ? 'bg-black text-[#bfecac]' : 'text-gray-400 hover:bg-gray-50'}`}
                  title="My Profile"
                >
                  <User size={20} className={state.currentPage === 'profile' ? 'text-[#bfecac]' : ''} />
                </button>

                <button 
                  onClick={goHome}
                  className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-[#bfecac] transition-colors"
                >
                  <ArrowLeft size={16} />
                  Home
                </button>
              </div>
            </div>
          </header>
        )}

        {state.currentPage === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 pt-32 pb-32"
          >
            <button 
              onClick={goBack}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#bfecac] mb-8 hover:gap-4 transition-all group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Go Back
            </button>

             <div className="mb-20 text-center">
               <div className="relative w-32 h-32 mx-auto mb-6 group">
                <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-white shadow-2xl overflow-hidden relative">
                  {userProfile.avatarUrl ? (
                    <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={64} />
                  )}
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    Change
                  </button>
                </div>
               </div>
               
              {isEditingProfile ? (
                 <form onSubmit={handleUpdateProfile} className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
                   <div className="space-y-4 text-left mb-6">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Display Name</label>
                        <input 
                          type="text" 
                          value={editProfileForm.name}
                          onChange={e => setEditProfileForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full p-4 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-[#bfecac]/30 transition-all font-bold text-black"
                          placeholder="Your Name"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Profile Picture</label>
                        <div className="flex items-center gap-4">
                          <label className="flex-1 cursor-pointer">
                            <div className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl hover:border-[#bfecac]/30 transition-all text-center">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Choose from gallery</span>
                            </div>
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setEditProfileForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          {editProfileForm.avatarUrl && (
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-100 shadow-sm">
                              <img src={editProfileForm.avatarUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>
                   </div>
                   <div className="flex gap-4">
                     <button 
                      type="submit"
                      className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-[#bfecac] hover:text-[#3b0a7a] transition-colors"
                     >
                       Save Changes
                     </button>
                     <button 
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-gray-200 transition-colors"
                     >
                       Cancel
                     </button>
                   </div>
                 </form>
               ) : (
                 <>
                  <h2 className="text-5xl font-black tracking-tighter">{userProfile.name}</h2>
                  <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mt-2">Culture Curator Since {new Date().getFullYear()}</p>
                  <div className="mt-8 flex justify-center gap-4">
                    <button 
                      onClick={() => { setEditProfileForm(userProfile); setIsEditingProfile(true); }}
                      className="px-6 py-2 border border-gray-200 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-colors"
                    >
                      Edit Profile
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="px-6 py-2 bg-red-50 text-red-500 border border-red-100 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      Logout
                    </button>
                   </div>
                 </>
               )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
               {/* User's Reviews */}
               <section>
                 <h3 className="text-2xl font-black tracking-tight mb-8 flex items-center gap-3">
                   <MessageSquare className="text-[#bfecac]" />
                   Your Reviews
                   <span className="text-xs text-gray-300 font-bold ml-2">({userReviews.length})</span>
                 </h3>
                 <div className="space-y-6">
                    {userReviews.length > 0 ? userReviews.map(review => {
                      const item = storedItems.find(i => i.id === review.itemId);
                      return (
                        <div key={review.id} className="p-8 rounded-[2rem] bg-white border border-gray-100 shadow-sm transition-all hover:shadow-xl">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-16 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                               {item && (
                                 <ImageWithFallback 
                                   src={item.imageUrl} 
                                   alt={item.title} 
                                   type={item.type} 
                                   title={item.title}
                                   creator={item.creator}
                                   className="w-full h-full object-cover" 
                                 />
                               )}
                            </div>
                            <div className="flex-1">
                               <h4 className="font-bold text-lg leading-tight line-clamp-1 text-[#bfecac]">{item?.title || 'Unknown Item'}</h4>
                               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item?.type} • {new Date(review.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="flex gap-0.5 text-[#bfecac]">
                               {[...Array(5)].map((_, i) => <Star key={i} size={12} fill={i < review.rating ? 'currentColor' : 'none'} />)}
                            </div>
                          </div>
                          <p className="text-black text-sm leading-relaxed italic border-l-4 border-[#bfecac]/20 pl-4">"{review.comment}"</p>
                        </div>
                      );
                    }) : (
                      <div className="py-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                        <p className="text-gray-400 font-medium">You haven't shared any thoughts yet.</p>
                      </div>
                    )}
                 </div>
               </section>

               {/* User's Recommendations */}
               <section>
                 <h3 className="text-2xl font-black tracking-tight mb-8 flex items-center gap-3">
                   <Plus className="text-[#bfecac]" />
                   Your Suggestions
                   <span className="text-xs text-gray-300 font-bold ml-2">({userRecs.length})</span>
                 </h3>
                 <div className="space-y-6">
                    {userRecs.length > 0 ? userRecs.map(rec => {
                      const sourceItem = storedItems.find(i => i.id === rec.sourceItemId);
                      return (
                        <div key={rec.id} className="p-8 rounded-[2rem] bg-[#bfecac] border-none shadow-lg shadow-[#bfecac]/20 transition-all hover:translate-y-[-4px]">
                          <div className="flex items-center gap-4 mb-6">
                             <div className="flex-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#3b0a7a]/50 mb-2 block">Recommendation</span>
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b0a7a]/10 shadow-sm">
                                      {sourceItem && (
                                        <ImageWithFallback 
                                          src={sourceItem.imageUrl} 
                                          alt={sourceItem.title} 
                                          type={sourceItem.type} 
                                          title={sourceItem.title}
                                          creator={sourceItem.creator}
                                          className="w-full h-full object-cover" 
                                        />
                                      )}
                                   </div>
                                   <div className="h-px flex-1 bg-[#3b0a7a]/10" />
                                   <div className="flex flex-col items-end gap-1">
                                      {rec.targetItem.type === 'music' && rec.targetItem.externalUrl && (
                                        <a 
                                          href={getSafeMusicUrl(rec.targetItem)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="Play Song on YouTube Music"
                                          className="p-1 px-2 rounded-full bg-black/10 text-black flex items-center gap-1 hover:bg-[#FF0000] hover:text-white transition-all transform hover:scale-105"
                                        >
                                          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
                                          </svg>
                                          <span className="text-[7px] font-black uppercase">Play</span>
                                        </a>
                                      )}
                                      <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#3b0a7a]/10 shadow-sm">
                                        <ImageWithFallback 
                                          src={rec.targetItem.imageUrl} 
                                          alt={rec.targetItem.title} 
                                          type={rec.targetItem.type} 
                                          title={rec.targetItem.title}
                                          creator={rec.targetItem.creator}
                                          className="w-full h-full object-cover" 
                                        />
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                          <h4 className="font-bold text-lg leading-tight mb-3 text-[#3b0a7a]">
                            Because of <span>"{sourceItem?.title}"</span> you suggested <span>"{rec.targetItem.title}"</span>
                          </h4>
                          <p className="text-[#3b0a7a] text-sm leading-relaxed italic border-l-4 border-[#3b0a7a]/10 pl-4 font-medium">"{rec.reason}"</p>
                        </div>
                      );
                    }) : (
                      <div className="py-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                        <p className="text-gray-400 font-medium">No suggestions to show right now.</p>
                      </div>
                    )}
                 </div>
               </section>
             </div>
          </motion.div>
        )}

        {state.currentPage === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-6 pt-32 pb-12"
          >
            <div className="mb-12 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#bfecac]">Results for "{state.searchQuery}"</h2>
                <div className="h-1.5 w-16 bg-[#bfecac] mt-3 rounded-full" />
              </div>
              {isSearching && (
                <div className="flex items-center gap-2 text-[#bfecac] font-bold text-xs uppercase tracking-widest animate-pulse">
                  <Loader2 className="animate-spin" size={14} />
                  Looking for more...
                </div>
              )}
            </div>

            {(searchResults.length > 0 || isSearching) ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {searchResults.map((item) => (
                  <motion.div
                    key={item.id}
                    layoutId={`card-${item.id}`}
                    onClick={() => handleSelectItem(item)}
                    className="group cursor-pointer"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="aspect-[2/3] rounded-3xl overflow-hidden mb-4 bg-gray-100 relative shadow-lg group-hover:shadow-2xl transition-all duration-300">
                      <ImageWithFallback 
                        src={item.imageUrl} 
                        alt={item.title} 
                        type={item.type}
                        title={item.title}
                        creator={item.creator}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                        {item.type}
                      </div>
                      {(item.type === 'music' && item.trailerUrl) && (
                        <a 
                          href={getSafeUrl(item.trailerUrl, item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Watch Music Video"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-4 right-14 bg-[#FF0000] text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-20"
                        >
                          <Play size={12} fill="currentColor" />
                        </a>
                      )}
                      {(item.type === 'music' && item.externalUrl) && (
                        <a 
                          href={getSafeMusicUrl(item)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Play on YouTube Music"
                          onClick={(e) => e.stopPropagation()} // Prevent card click
                          className="absolute top-4 right-4 bg-[#FF0000] text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform z-20 flex items-center justify-center"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
                          </svg>
                        </a>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <p className="text-white text-sm font-medium">View detailed suggestions</p>
                      </div>
                    </div>
                    <h3 className="font-bold text-xl leading-tight mb-1 group-hover:text-[#bfecac]/80 transition-colors text-[#bfecac]">{item.title}</h3>
                    <p className="text-[#bfecac]/70 font-medium">{item.creator} • {item.year}</p>
                  </motion.div>
                ))}
                
                {isSearching && Array.from({ length: searchResults.length === 0 ? 8 : 4 }).map((_, i) => (
                  <div key={`skeleton-${i}`} className="animate-pulse">
                    <div className="aspect-[2/3] rounded-3xl bg-gray-200 mb-4" />
                    <div className="h-6 w-3/4 bg-gray-200 rounded-md mb-2" />
                    <div className="h-4 w-1/2 bg-gray-100 rounded-md" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-[#bfecac]/20 text-[#bfecac] rounded-full flex items-center justify-center mb-6">
                  <Search size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">No direct matches found</h3>
                <p className="text-gray-500 max-w-sm">Try searching for a broader term like a genre or a different artist, or check your spelling.</p>
              </div>
            )}
          </motion.div>
        )}

        {state.currentPage === 'detail' && selectedItem && (
          <motion.div
            key="detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pb-32"
          >
            {/* Immersive Header */}
            <div className="min-h-[440px] md:min-h-[500px] relative overflow-hidden bg-black flex flex-col justify-end">
               <ImageWithFallback 
                src={selectedItem.imageUrl} 
                alt={selectedItem.title} 
                type={selectedItem.type}
                title={selectedItem.title}
                creator={selectedItem.creator}
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-30 scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#3b0a7a]" />
              
            <div className="relative pt-24 pb-10 px-6 max-w-7xl mx-auto w-full">
              <button 
                onClick={goBack}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#bfecac] mb-5 hover:gap-4 transition-all group"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                Go Back
              </button>
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-end">
                  <motion.div 
                    layoutId={`card-${selectedItem.id}`}
                    className="w-44 md:w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)] flex-shrink-0 bg-gray-200 border-4 border-white group relative"
                  >
                     <ImageWithFallback 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.title} 
                      type={selectedItem.type}
                      title={selectedItem.title}
                      creator={selectedItem.creator}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </motion.div>
  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-6">
                      <span className="px-4 py-1.5 rounded-full bg-[#bfecac] text-[#3b0a7a] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[#bfecac]/20">
                        {selectedItem.type}
                      </span>
                      <div className="h-px flex-1 bg-white/20" />
                      <div className="flex flex-col sm:flex-row gap-3">
                        {selectedItem.trailerUrl && (
                          <a 
                            href={getSafeUrl(selectedItem.trailerUrl, selectedItem)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0 ${
                              selectedItem.type === 'music' ? 'bg-[#FF0000] text-white shadow-[#FF0000]/20' : 'bg-[#bfecac] text-[#3b0a7a] shadow-[#bfecac]/20'
                            }`}
                          >
                            <Play size={14} fill="currentColor" />
                            {selectedItem.type === 'music' ? 'Watch Music Video' : 'Watch Trailer'}
                          </a>
                        )}
                        {selectedItem.externalUrl && (
                          <a 
                            href={selectedItem.type === 'music' ? getSafeMusicUrl(selectedItem) : getSafeUrl(selectedItem.externalUrl)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 ${
                              selectedItem.type === 'music'
                                ? 'bg-[#FF0000] text-white shadow-lg shadow-[#FF0000]/20 hover:bg-[#E60000]' 
                                : 'bg-black text-white hover:bg-gray-800'
                            }`}
                          >
                            {selectedItem.type === 'music' ? (
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
                              </svg>
                            ) : (
                              <Search size={14} />
                            )}
                            {selectedItem.type === 'music' 
                              ? 'Play on YouTube Music' 
                              : 'View Details'}
                          </a>
                        )}
                      </div>
                    </div>
                    <h1 className="text-3xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-2 leading-tight text-[#bfecac]">{selectedItem.title}</h1>
                    <p className="text-xl md:text-2xl font-medium text-[#bfecac]/80 italic">by {selectedItem.creator}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                
                {/* Main Content */}
                <div className="lg:col-span-12">
                   <div className="bg-white p-6 md:p-10 rounded-3xl border border-gray-100 shadow-sm mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                      <div className="md:col-span-2">
                        <h3 className="text-xs font-black uppercase tracking-[.3em] text-black/40 mb-6">Description</h3>
                        <p className="text-xl text-black leading-relaxed font-light">
                          {selectedItem.description}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-[.3em] text-black/40 mb-6">Details</h3>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs text-black/30 uppercase font-bold mb-1">Release Year</p>
                            <p className="font-bold text-black">{selectedItem.year || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-black/30 uppercase font-bold mb-1">Genres</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {selectedItem.genres.map(g => (
                                <span key={g} className="px-3 py-1 bg-black/5 rounded-full text-xs font-bold border border-black/10 text-black">{g}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Recommendations Section */}
                    <section>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black tracking-tight text-[#bfecac]">Suggestions</h2>
                        <button 
                          onClick={() => userProfile.isAuthenticated ? setShowRecModal(true) : setShowLoginModal(true)}
                          className="h-10 w-10 bg-[#bfecac] text-[#3b0a7a] rounded-full flex items-center justify-center hover:opacity-90 transition-colors shadow-lg"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                        {recsLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <div key={`rec-skeleton-${i}`} className="p-6 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6 animate-pulse">
                              <div className="w-20 h-28 bg-gray-200 rounded-2xl flex-shrink-0" />
                              <div className="flex-1 space-y-3">
                                <div className="h-3 w-16 bg-gray-200 rounded" />
                                <div className="h-6 w-3/4 bg-gray-200 rounded" />
                                <div className="h-4 w-full bg-gray-100 rounded" />
                                <div className="h-3 w-24 bg-gray-100 rounded" />
                              </div>
                            </div>
                          ))
                        ) : itemRecs.length > 0 ? itemRecs.map(rec => (
                          <motion.div 
                            key={rec.id} 
                            whileHover={{ scale: 1.02 }}
                            onClick={() => handleSelectItem(rec.targetItem)}
                            className="p-6 rounded-[2rem] bg-[#bfecac] border-none flex gap-6 group cursor-pointer shadow-lg shadow-[#bfecac]/20"
                          >
                            <div className="w-20 h-28 bg-[#3b0a7a]/10 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                              <ImageWithFallback 
                                src={rec.targetItem.imageUrl} 
                                alt={rec.targetItem.title} 
                                type={rec.targetItem.type} 
                                title={rec.targetItem.title}
                                creator={rec.targetItem.creator}
                                className="w-full h-full object-cover" 
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className="text-[9px] font-black uppercase tracking-widest text-[#3b0a7a]/60 block">{rec.targetItem.type}</span>
                                <div className="flex gap-2">
                                  {rec.targetItem.type === 'music' && rec.targetItem.trailerUrl && (
                                    <a 
                                      href={getSafeUrl(rec.targetItem.trailerUrl, rec.targetItem)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Watch Music Video"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 px-2 rounded-full bg-[#FF0000] text-white flex items-center gap-1 hover:scale-110 transition-transform"
                                    >
                                      <Play size={10} fill="currentColor" />
                                      <span className="text-[8px] font-black uppercase">Video</span>
                                    </a>
                                  )}
                                  {rec.targetItem.type === 'music' && rec.targetItem.externalUrl && (
                                    <a 
                                      href={getSafeMusicUrl(rec.targetItem)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="Play on YouTube Music"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 px-2 rounded-full bg-[#FF0000] text-white flex items-center gap-1 hover:scale-110 transition-transform"
                                    >
                                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm-1 1.5l3 1.5-3 1.5v-3z"/>
                                      </svg>
                                      <span className="text-[8px] font-black uppercase">Play</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <h4 className="text-xl font-bold leading-tight transition-colors text-[#3b0a7a]">
                                If you like this, discover <span className="underline underline-offset-4 opacity-70">{rec.targetItem.title}</span>
                              </h4>
                              <p className="text-[#3b0a7a] text-sm mt-3 leading-relaxed italic font-medium">"{rec.reason}"</p>
                              <div className="mt-4 flex items-center gap-2">
                                <div className="w-5 h-5 bg-[#3b0a7a]/10 rounded-full flex items-center justify-center text-[#3b0a7a]">
                                  <User size={10} />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#3b0a7a]/50">{rec.userName}</span>
                              </div>
                            </div>
                          </motion.div>
                        )) : (
                          <div className="py-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                            <p className="text-gray-400 font-medium">Help the community grow by adding a suggestion!</p>
                          </div>
                        )}
                      </div>
                    </section>

                    {/* Reviews Section */}
                    <section>
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-black tracking-tight text-[#bfecac]">Thoughts</h2>
                        <button 
                          onClick={() => userProfile.isAuthenticated ? setShowReviewModal(true) : setShowLoginModal(true)}
                          className="h-10 w-10 bg-white border border-gray-200 text-black rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-colors shadow-sm"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      <div className="space-y-6">
                         {reviewsLoading ? (
                           Array.from({ length: 3 }).map((_, i) => (
                             <div key={`rev-skeleton-${i}`} className="p-8 rounded-[2rem] bg-gray-50 border border-gray-100 animate-pulse space-y-4">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                   <div className="space-y-2">
                                     <div className="h-3 w-20 bg-gray-200 rounded" />
                                     <div className="h-2 w-16 bg-gray-100 rounded" />
                                   </div>
                                 </div>
                                 <div className="flex gap-1">
                                   {[...Array(5)].map((_, i) => <div key={i} className="w-3 h-3 bg-gray-200 rounded-full" />)}
                                 </div>
                               </div>
                               <div className="h-4 w-full bg-gray-100 rounded" />
                               <div className="h-4 w-5/6 bg-gray-50 rounded" />
                             </div>
                           ))
                         ) : itemReviews.length > 0 ? itemReviews.map(review => (
                          <div key={review.id} className="p-8 rounded-[2rem] bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-0 bg-[#bfecac] group-hover:h-full transition-all duration-500" />
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                                  {(review.userName || '?').charAt(0)}
                                </div>
                                <div>
                                  <span className="font-black text-[10px] uppercase tracking-widest block">{review.userName}</span>
                                  <span className="text-[10px] text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex gap-1 text-yellow-400">
                                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < review.rating ? 'currentColor' : 'none'} className={i < review.rating ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : ''} />)}
                              </div>
                            </div>
                            <p className="text-black leading-relaxed italic font-medium">"{review.comment}"</p>
                          </div>
                        )) : (
                          <div className="py-20 text-center border-4 border-dashed border-gray-100 rounded-[3rem]">
                            <p className="text-gray-400 font-medium">No reviews yet. Be the first to share your opinion!</p>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-white/20 backdrop-blur-2xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 40 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 40 }}
              className="w-full max-w-lg bg-white rounded-[3rem] p-12 relative shadow-2xl border border-gray-100"
            >
              <button onClick={() => setShowLoginModal(false)} className="absolute top-8 right-8 p-2 text-gray-300 hover:text-black transition-colors">
                <X size={28} />
              </button>
              
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-black rounded-2xl mx-auto mb-6 flex items-center justify-center text-white rotate-12 shadow-xl">
                  <User size={32} />
                </div>
                <h2 className="text-4xl font-black tracking-tighter mb-2">Welcome Back</h2>
                <p className="text-gray-400 font-medium text-sm">Join the culture curators community</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 block text-center">Identity</label>
                  <input 
                    type="text" 
                    required
                    value={loginForm.name}
                    onChange={e => setLoginForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-5 bg-gray-50 border border-transparent rounded-[2rem] focus:bg-white focus:border-[#bfecac]/30 transition-all font-bold text-center text-lg text-black shadow-inner"
                    placeholder="User Name"
                  />
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block text-center">Profile Photo</label>
                   <div className="flex items-center justify-center gap-4">
                      <label className="cursor-pointer group flex flex-col items-center">
                        <div className="w-20 h-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-full flex items-center justify-center group-hover:border-[#bfecac] group-hover:bg-[#bfecac]/10 transition-all overflow-hidden relative">
                          {loginForm.avatarUrl ? (
                            <img src={loginForm.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Plus size={24} className="text-gray-300 group-hover:text-[#bfecac]" />
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLoginForm(prev => ({ ...prev, avatarUrl: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                   </div>
                </div>

                <div className="space-y-4 pt-4">
                  <button 
                    type="submit"
                    className="w-full py-5 bg-black text-white rounded-[2rem] font-bold uppercase text-xs tracking-widest hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
                  >
                    <User size={18} />
                    Continue with Google
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 relative shadow-2xl"
            >
              <button onClick={() => setShowReviewModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black mb-2">Write Review</h2>
              <p className="text-gray-500 mb-8">What are your thoughts on {selectedItem?.title}?</p>
              
              <form onSubmit={submitReview} className="space-y-6">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Your Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        type="button"
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                        className={`p-2 transition-transform active:scale-110 ${newReview.rating >= star ? 'text-[#bfecac]' : 'text-gray-200'}`}
                      >
                        <Star size={28} fill={newReview.rating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">User Name</label>
                  <input 
                    type="text" 
                    value={newReview.userName}
                    onChange={e => setNewReview(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder={userProfile.name || "E.g. CinemaLover22"}
                    className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 text-black shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Comment</label>
                  <textarea 
                    required
                    value={newReview.comment}
                    onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    placeholder="Share your thoughts here..."
                    className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 resize-none text-black shadow-inner"
                  />
                </div>
                <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-bold hover:bg-[#bfecac] hover:text-[#3b0a7a] transition-colors shadow-xl">
                  Post Review
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recommendation Modal */}
      <AnimatePresence>
        {showRecModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] p-10 relative shadow-2xl"
            >
              <button onClick={() => setShowRecModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-black transition-colors">
                <X size={24} />
              </button>
              <h2 className="text-3xl font-black mb-2">Add Suggestion</h2>
              <p className="text-gray-500 mb-8">What should fans of {selectedItem?.title} check out next?</p>
              
              <form onSubmit={submitRecommendation} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Target Title</label>
                    <div className="relative">
                      <input 
                        required
                        type="text" 
                        value={newRec.title}
                        onChange={e => setNewRec(prev => ({ ...prev, title: e.target.value }))}
                        onBlur={fetchRecPreview}
                        placeholder="Title of suggestion..."
                        className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 pr-12 text-black"
                      />
                      <button 
                        type="button" 
                        onClick={fetchRecPreview}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#bfecac] hover:bg-[#bfecac]/10 rounded-lg transition-colors"
                      >
                        {isPreviewLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Category</label>
                    <select 
                      value={newRec.type}
                      onChange={e => setNewRec(prev => ({ ...prev, type: e.target.value as ItemType }))}
                      className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 text-black"
                    >
                      <option value="music">Music</option>
                      <option value="movie">Movie</option>
                      <option value="series">Series</option>
                    </select>
                  </div>
                </div>

                {/* Preview Section */}
                {(recPreview || isPreviewLoading) && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-[#bfecac]/5 border border-[#bfecac]/20 flex gap-4 items-center"
                  >
                    <div className="w-16 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 animate-pulse">
                      {recPreview && (
                        <ImageWithFallback 
                          src={recPreview.imageUrl} 
                          alt={recPreview.title} 
                          type={recPreview.type} 
                          title={recPreview.title}
                          creator={recPreview.creator}
                          className="w-full h-full object-cover" 
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      {isPreviewLoading ? (
                        <div className="space-y-2">
                          <div className="h-4 w-3/4 bg-[#bfecac]/20 rounded animate-bounce" />
                          <div className="h-3 w-1/2 bg-[#bfecac]/10 rounded animate-bounce" />
                        </div>
                      ) : (
                        <>
                          <h4 className="font-bold text-sm leading-tight">{recPreview?.title}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">{recPreview?.creator} • {recPreview?.year}</p>
                          <p className="text-[9px] text-[#bfecac] font-black mt-1 uppercase tracking-widest">Preview Found</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">Reason</label>
                  <textarea 
                    required
                    value={newRec.reason}
                    onChange={e => setNewRec(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    placeholder="Why would they like this? (e.g. 'Similar dark atmosphere')"
                    className="w-full p-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 resize-none text-black shadow-inner"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2 block">User Name</label>
                  <input 
                    type="text" 
                    value={newRec.userName}
                    onChange={e => setNewRec(prev => ({ ...prev, userName: e.target.value }))}
                    placeholder={userProfile.name || "E.g. CultureCurator"}
                    className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#bfecac]/50 text-black shadow-inner"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#bfecac] text-[#3b0a7a] rounded-2xl font-bold hover:bg-black hover:text-white transition-colors shadow-xl flex items-center justify-center gap-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={20} />}
                  {isSubmitting ? 'Verifying Suggestion...' : 'Publish Suggestion'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
