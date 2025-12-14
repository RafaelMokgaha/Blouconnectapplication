
import React, { useState } from 'react';
import { VILLAGES } from '../constants';
import { Search, TrendingUp, Calendar, Trophy, Heart, ArrowLeft, User, MessageCircle, MapPin, Loader2 } from 'lucide-react';
import { Feed } from './Feed';
import { PostCategory, User as UserType } from '../types';
import { useApp } from '../contexts/AppContext';
import { db, auth } from '../firebaseConfig';

export const Discovery = () => {
  const [selectedCategory, setSelectedCategory] = useState<PostCategory | null>(null);
  const { activeVillageFilter, setVillageFilter, posts, startChat, viewProfile } = useApp();
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [userResults, setUserResults] = useState<UserType[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Calculate trending villages based on post count
  const trendingVillages = React.useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
        counts[p.village] = (counts[p.village] || 0) + 1;
    });
    
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Sort by post count descending
        .slice(0, 5) // Top 5
        .map(([name, count]) => ({ name, count }));
  }, [posts]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
        setUserResults([]);
        return;
    }

    setIsSearching(true);
    
    // Initialize results with local matches from posts (fallback if DB fails)
    const localUsersMap = new Map<string, UserType>();
    const lowerTerm = term.toLowerCase();

    // 1. Search locally in posts
    posts.forEach(p => {
        if (!localUsersMap.has(p.userId) && p.userName.toLowerCase().includes(lowerTerm)) {
            localUsersMap.set(p.userId, {
                id: p.userId,
                fullName: p.userName,
                avatar: p.userAvatar,
                village: p.village,
                isVerified: p.userIsVerified,
                // Fill defaults for partial user object
                email: '',
                dob: '',
                isOnline: false,
                followers: 0,
                following: 0
            });
        }
    });

    let combinedResults = Array.from(localUsersMap.values());

    // 2. Try Firestore Search if authenticated
    if (auth.currentUser) {
        try {
            const snapshot = await db.collection('users')
                .where('fullName', '>=', term)
                .where('fullName', '<=', term + '\uf8ff')
                .limit(10)
                .get();
            
            const remoteUsers = snapshot.docs.map(doc => doc.data() as UserType);
            
            // Merge remote users, avoiding duplicates
            remoteUsers.forEach(u => {
                if (!localUsersMap.has(u.id)) {
                    combinedResults.push(u);
                }
            });
            
        } catch (e) {
            // Silently fail or log debug
            console.debug("Firestore search skipped or failed", e);
        }
    }
    
    setUserResults(combinedResults);
    setIsSearching(false);
  };

  const CategoryCard = ({ icon: Icon, title, color, category }: { icon: any, title: string, color: string, category: PostCategory }) => (
    <button 
        onClick={() => setSelectedCategory(category)}
        className={`flex flex-col items-center justify-center p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 ${color} bg-opacity-10 dark:bg-opacity-10 cursor-pointer active:scale-95 transition-transform w-full`}
    >
        <div className={`p-3 rounded-full mb-2 ${color} text-white shadow-md`}>
            <Icon size={20} />
        </div>
        <span className="text-sm font-semibold dark:text-gray-200">{title}</span>
    </button>
  );

  if (selectedCategory) {
      return (
          <div className="flex flex-col h-full">
              <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
                  <button onClick={() => setSelectedCategory(null)} className="p-2 -ml-2 text-gray-600 dark:text-white">
                      <ArrowLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold ml-2 dark:text-white">{selectedCategory}</h1>
              </div>
              <Feed filterCategory={selectedCategory} />
          </div>
      );
  }

  if (activeVillageFilter) {
      return (
          <div className="flex flex-col h-full">
              <div className="flex items-center p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
                  <button onClick={() => setVillageFilter(null)} className="p-2 -ml-2 text-gray-600 dark:text-white">
                      <ArrowLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold ml-2 dark:text-white">{activeVillageFilter}</h1>
              </div>
              <Feed filterVillage={activeVillageFilter} />
          </div>
      );
  }

  return (
    <div className="pt-4 pb-20">
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold text-blou-900 dark:text-white mb-2">Discovery</h1>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search village or people..." 
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none dark:text-white focus:ring-2 focus:ring-blou-500"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Search Results Mode */}
      {searchTerm.trim() ? (
          <div className="px-4">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">People</h3>
              
              {isSearching ? (
                  <div className="flex justify-center py-4">
                      <Loader2 className="animate-spin text-blou-600" />
                  </div>
              ) : userResults.length > 0 ? (
                  <div className="space-y-3">
                      {userResults.map(user => (
                          <div key={user.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                             <div className="flex items-center space-x-3 flex-1 overflow-hidden" onClick={() => viewProfile(user.id)}>
                                 <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                 <div className="flex-1 min-w-0">
                                     <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{user.fullName}</h4>
                                     <p className="text-xs text-gray-500 flex items-center">
                                         <MapPin size={10} className="mr-1" />
                                         {user.village}
                                     </p>
                                 </div>
                             </div>
                             <button 
                                onClick={() => startChat(user)}
                                className="ml-2 p-2 bg-blou-100 dark:bg-gray-700 text-blou-600 dark:text-white rounded-full hover:bg-blou-200 dark:hover:bg-gray-600 transition-colors"
                             >
                                 <MessageCircle size={18} />
                             </button>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-8 text-gray-400">
                      No people found matching "{searchTerm}"
                  </div>
              )}

              {/* Also show villages matching search */}
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-6 mb-3">Villages</h3>
              <div className="space-y-2">
                 {VILLAGES.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase())).map(v => (
                     <div 
                        key={v} 
                        onClick={() => setVillageFilter(v)}
                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center cursor-pointer"
                     >
                        <span className="text-sm font-medium dark:text-gray-200">{v}</span>
                     </div>
                 ))}
                 {VILLAGES.filter(v => v.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                     <p className="text-sm text-gray-400 italic">No villages found.</p>
                 )}
              </div>
          </div>
      ) : (
          /* Default Discovery Mode */
          <>
            {/* Categories */}
            <div className="px-4 grid grid-cols-3 gap-3 mb-6">
                <CategoryCard icon={Heart} title="Funerals" category="Funerals" color="bg-gray-500" />
                <CategoryCard icon={Calendar} title="Events" category="Events" color="bg-purple-500" />
                <CategoryCard icon={Trophy} title="Sports" category="Sports" color="bg-green-500" />
            </div>

            {/* Trending List - Dynamic */}
            {trendingVillages.length > 0 && (
                <div className="bg-white dark:bg-gray-800 mx-4 rounded-xl p-4 shadow-sm mb-6 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center space-x-2 mb-4 text-blou-600 dark:text-blou-400 font-semibold border-b border-gray-100 dark:border-gray-700 pb-2">
                    <TrendingUp size={20} />
                    <h2>Trending Villages</h2>
                    </div>
                    
                    <div className="space-y-3">
                        {trendingVillages.map((village, index) => (
                            <div 
                                key={village.name} 
                                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                                onClick={() => setVillageFilter(village.name)}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className={`text-sm font-bold w-4 ${index < 3 ? 'text-blou-600' : 'text-gray-400'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{village.name}</p>
                                        <p className="text-[10px] text-gray-500">{village.count} posts</p>
                                    </div>
                                </div>
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center">
                                    🔥 Hot
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Area List */}
            <div className="px-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">All Areas ({VILLAGES.length})</h3>
                <div className="grid grid-cols-2 gap-3">
                {VILLAGES.map((v, i) => (
                    <div 
                        key={v} 
                        onClick={() => setVillageFilter(v)}
                        className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex justify-between items-center group active:scale-95 transition-transform cursor-pointer"
                    >
                    <span className="text-sm font-medium dark:text-gray-200 truncate">{v}</span>
                    <div className="w-2 h-2 rounded-full bg-green-400 opacity-0 group-hover:opacity-100"></div>
                    </div>
                ))}
                </div>
            </div>
          </>
      )}
    </div>
  );
};
