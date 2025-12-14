
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Moon, Sun, LogOut, Settings, Edit2, MapPin, Phone, Camera, User as UserIcon, Save, ArrowLeft, Shield, Trash2, BadgeCheck, X, Check, Mail, Loader2, Grid, List } from 'lucide-react';
import { VILLAGES } from '../constants';
import { uploadFile } from '../utils/storage';
import { Feed } from './Feed';

interface ProfileProps {
    targetUserId?: string | null;
    onBack?: () => void;
}

export const Profile = ({ targetUserId, onBack }: ProfileProps) => {
  const { user, isDarkMode, toggleDarkMode, logout, updateUser, deleteAccount, posts, toggleFollow, isFollowing } = useApp();
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [aboutText, setAboutText] = useState('');
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  // States for account editing
  const [editingField, setEditingField] = useState<'name' | 'phone' | 'email' | 'village' | null>(null);
  const [editValue, setEditValue] = useState('');

  // Determine who we are viewing
  let displayUser = user;
  let isMe = true;

  if (targetUserId && user && targetUserId !== user.id) {
      isMe = false;
      const foundPost = posts.find(p => p.userId === targetUserId);
      
      if (foundPost) {
          // Construct a partial view of the user from their post data
          displayUser = {
              id: foundPost.userId,
              fullName: foundPost.userName,
              email: '', // Not available
              avatar: foundPost.userAvatar,
              village: foundPost.village,
              dob: '', 
              phoneNumber: '',
              followers: 0, 
              following: 0,
              isOnline: false,
              banner: '',
              totalLikes: 0,
              about: 'Community Member',
              isVerified: foundPost.userIsVerified
          };
      } else {
          displayUser = null; 
      }
  }

  if (!displayUser) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-900 text-gray-500">
              <p>User not found.</p>
              <button onClick={onBack} className="mt-4 text-blou-600">Go Back</button>
          </div>
      );
  }

  React.useEffect(() => {
      setAboutText(displayUser?.about || '');
  }, [displayUser]);

  const amIFollowing = !isMe && displayUser ? isFollowing(displayUser.id) : false;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    if (e.target.files && e.target.files[0] && isMe && user) {
      const file = e.target.files[0];
      setUploading(type);
      try {
        const downloadUrl = await uploadFile(file, user.id, `User ${type}`);
        await updateUser({ [type]: downloadUrl });
      } catch (error) {
        alert("Failed to upload image. Please try again.");
      } finally {
        setUploading(null);
      }
    }
  };

  const handleSaveAbout = () => {
    updateUser({ about: aboutText });
    setIsEditingAbout(false);
  };

  const startEditing = (field: 'name' | 'phone' | 'email' | 'village') => {
      setEditingField(field);
      if (field === 'name') setEditValue(user?.fullName || '');
      if (field === 'phone') setEditValue(user?.phoneNumber || '');
      if (field === 'email') setEditValue(user?.email || '');
      if (field === 'village') setEditValue(user?.village || VILLAGES[0]);
  };

  const saveEditing = () => {
      if (!editingField || !editValue.trim()) return;
      
      if (editingField === 'name') updateUser({ fullName: editValue });
      if (editingField === 'phone') updateUser({ phoneNumber: editValue });
      if (editingField === 'email') updateUser({ email: editValue });
      if (editingField === 'village') updateUser({ village: editValue });
      
      setEditingField(null);
  };

  if (showPrivacySettings && isMe && displayUser) {
      const followerProgress = Math.min(100, (displayUser.followers / 1000) * 100);
      const likesProgress = Math.min(100, ((displayUser.totalLikes || 0) / 10000) * 100);

      return (
          <div className="bg-white dark:bg-gray-900 min-h-screen pb-20 animate-slide-up">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center">
                  <button onClick={() => setShowPrivacySettings(false)} className="mr-3 text-gray-600 dark:text-gray-300">
                      <ArrowLeft />
                  </button>
                  <h2 className="text-xl font-bold dark:text-white">Edit Profile & Settings</h2>
              </div>
              <div className="p-4 space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-bold mb-3 dark:text-white">Profile Information</h3>
                      
                      {/* Change Name */}
                      <div className="py-3 border-b border-gray-200 dark:border-gray-700">
                          {editingField === 'name' ? (
                              <div className="flex items-center space-x-2 animate-fade-in">
                                  <input 
                                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="Full Name"
                                    autoFocus
                                  />
                                  <button onClick={saveEditing} className="p-2 bg-green-500 text-white rounded-lg"><Check size={16}/></button>
                                  <button onClick={() => setEditingField(null)} className="p-2 bg-gray-300 text-gray-700 rounded-lg"><X size={16}/></button>
                              </div>
                          ) : (
                              <button onClick={() => startEditing('name')} className="w-full text-left flex justify-between items-center text-gray-700 dark:text-gray-300">
                                  <span>Change Name</span>
                                  <span className="text-sm text-gray-400 font-semibold">{user?.fullName}</span>
                              </button>
                          )}
                      </div>

                      {/* Change Email */}
                      <div className="py-3 border-b border-gray-200 dark:border-gray-700">
                          {editingField === 'email' ? (
                              <div className="flex items-center space-x-2 animate-fade-in">
                                  <input 
                                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="Email Address"
                                    type="email"
                                  />
                                  <button onClick={saveEditing} className="p-2 bg-green-500 text-white rounded-lg"><Check size={16}/></button>
                                  <button onClick={() => setEditingField(null)} className="p-2 bg-gray-300 text-gray-700 rounded-lg"><X size={16}/></button>
                              </div>
                          ) : (
                              <button onClick={() => startEditing('email')} className="w-full text-left flex justify-between items-center text-gray-700 dark:text-gray-300">
                                  <span>Change Email</span>
                                  <span className="text-sm text-gray-400 font-semibold">{user?.email || 'Not set'}</span>
                              </button>
                          )}
                      </div>

                      {/* Change Phone */}
                      <div className="py-3 border-b border-gray-200 dark:border-gray-700">
                          {editingField === 'phone' ? (
                              <div className="flex items-center space-x-2 animate-fade-in">
                                  <input 
                                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    placeholder="Phone Number"
                                    type="tel"
                                  />
                                  <button onClick={saveEditing} className="p-2 bg-green-500 text-white rounded-lg"><Check size={16}/></button>
                                  <button onClick={() => setEditingField(null)} className="p-2 bg-gray-300 text-gray-700 rounded-lg"><X size={16}/></button>
                              </div>
                          ) : (
                              <button onClick={() => startEditing('phone')} className="w-full text-left flex justify-between items-center text-gray-700 dark:text-gray-300">
                                  <span>Change Phone Number</span>
                                  <span className="text-sm text-gray-400 font-semibold">{user?.phoneNumber}</span>
                              </button>
                          )}
                      </div>

                      {/* Change Location */}
                      <div className="py-3">
                          {editingField === 'village' ? (
                              <div className="flex items-center space-x-2 animate-fade-in">
                                  <select 
                                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-white text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  >
                                      {VILLAGES.map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                  <button onClick={saveEditing} className="p-2 bg-green-500 text-white rounded-lg"><Check size={16}/></button>
                                  <button onClick={() => setEditingField(null)} className="p-2 bg-gray-300 text-gray-700 rounded-lg"><X size={16}/></button>
                              </div>
                          ) : (
                              <button onClick={() => startEditing('village')} className="w-full text-left flex justify-between items-center text-gray-700 dark:text-gray-300">
                                  <span>Change Location</span>
                                  <span className="text-sm text-gray-400 font-semibold">{user?.village}</span>
                              </button>
                          )}
                      </div>
                  </div>

                   {/* App Preferences */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-bold mb-3 dark:text-white">App Settings</h3>
                      
                      {/* Dark Mode */}
                      <button 
                        onClick={toggleDarkMode}
                        className="w-full flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center text-gray-700 dark:text-gray-200">
                            {isDarkMode ? <Sun size={20} className="mr-3" /> : <Moon size={20} className="mr-3" />}
                            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                        </div>
                        <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-blou-600' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white transform transition-transform shadow-sm ${isDarkMode ? 'translate-x-4' : ''}`}></div>
                        </div>
                      </button>

                      {/* Logout */}
                      <button 
                        onClick={logout}
                        className="w-full flex items-center py-3 text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors mt-2"
                      >
                        <LogOut size={20} className="mr-3" />
                        <span>Log Out</span>
                      </button>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <h3 className="font-bold mb-3 dark:text-white flex items-center">
                          <Shield size={18} className="mr-2 text-blou-600" /> Verification Status
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">You will be automatically verified once you reach 1k followers and 10k total likes.</p>
                      
                      {displayUser.isVerified ? (
                          <div className="text-white bg-blou-500 font-bold flex items-center p-3 rounded-lg shadow-md justify-center">
                              <BadgeCheck className="mr-2 text-white fill-blou-500" /> Verified Account
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <div>
                                  <div className="flex justify-between text-xs font-semibold mb-1 dark:text-gray-300">
                                      <span>Followers Progress</span>
                                      <span>{displayUser.followers} / 1000</span>
                                  </div>
                                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-blou-500 transition-all duration-500" style={{ width: `${followerProgress}%` }}></div>
                                  </div>
                              </div>
                              <div>
                                  <div className="flex justify-between text-xs font-semibold mb-1 dark:text-gray-300">
                                      <span>Likes Progress</span>
                                      <span>{displayUser.totalLikes || 0} / 10000</span>
                                  </div>
                                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${likesProgress}%` }}></div>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl">
                      <h3 className="font-bold mb-3 text-red-600">Danger Zone</h3>
                      {!showDeleteConfirm ? (
                          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 bg-white dark:bg-gray-800 text-red-600 border border-red-200 dark:border-red-900 rounded-lg font-semibold flex items-center justify-center">
                              <Trash2 size={18} className="mr-2" /> Delete Account
                          </button>
                      ) : (
                          <div className="text-center">
                              <p className="text-red-600 text-sm mb-3">Are you sure? This action cannot be undone.</p>
                              <div className="flex space-x-3">
                                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-gray-200 text-gray-800 rounded-lg">Cancel</button>
                                  <button onClick={deleteAccount} className="flex-1 py-2 bg-red-600 text-white rounded-lg">Yes, Delete</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="pb-20 relative bg-white dark:bg-gray-900 min-h-screen">
      {/* Back button if viewing another profile */}
      {!isMe && (
          <button onClick={onBack} className="absolute top-4 left-4 z-20 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors">
              <ArrowLeft size={24} />
          </button>
      )}

      {/* Cover Banner */}
      <div className="h-48 bg-gray-300 relative group overflow-hidden z-0">
        {displayUser.banner ? (
          <img src={displayUser.banner} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-blou-600 to-blou-400"></div>
        )}
        
        {/* Banner Upload Spinner */}
        {uploading === 'banner' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <Loader2 className="animate-spin text-white" size={32} />
            </div>
        )}

        {isMe && (
            <label className="absolute top-4 right-4 bg-black/50 p-2 rounded-full cursor-pointer text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/70 z-10">
            <Camera size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} disabled={!!uploading} />
            </label>
        )}
      </div>

      {/* Profile Actions & Avatar Container */}
      <div className="relative px-4">
        
        {/* Avatar - Absolutely Positioned relative to this container */}
        <div className="absolute -top-12 left-4 z-20">
             <div className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-900 overflow-hidden bg-gray-200 relative group shadow-lg">
                <img src={displayUser.avatar} className="w-full h-full object-cover" />
                
                {/* Avatar Upload Spinner */}
                {uploading === 'avatar' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                )}

                {isMe && !uploading && (
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={24} className="text-white" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />
                    </label>
                )}
            </div>
        </div>

        {/* Action Buttons (Edit/Follow) - Right aligned, pushing content down if needed */}
        <div className="flex justify-end py-3 min-h-[60px]">
            {!isMe ? (
                <button 
                    onClick={() => displayUser && toggleFollow(displayUser.id)}
                    className={`${
                        amIFollowing
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
                        : 'bg-blou-600 text-white shadow-lg shadow-blou-600/30'
                    } px-6 py-2 rounded-full font-bold text-sm transition-all active:scale-95`}
                >
                    {amIFollowing ? 'Following' : 'Follow'}
                </button>
            ) : (
                <button 
                    onClick={() => setShowPrivacySettings(true)}
                    className="border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-full font-semibold text-sm text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                    Edit Profile & Settings
                </button>
            )}
        </div>

        {/* User Name & Details - Flows Standardly Below */}
        <div className="mt-2">
            <h1 className="text-2xl font-bold dark:text-white flex items-center leading-tight">
                 {displayUser.fullName}
                 {displayUser.isVerified && (
                     <div className="relative w-5 h-5 ml-1 flex items-center justify-center">
                        <div className="absolute inset-0 bg-blou-500 rounded-full"></div>
                        <BadgeCheck size={20} className="text-white fill-blou-500 relative z-10" />
                    </div>
                 )}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">@{displayUser.fullName.replace(/\s/g, '').toLowerCase()}</p>
        </div>

        {/* About Me (Moved UP) */}
        <div className="mt-6 mb-2">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">About Me</h3>
                {isMe && !isEditingAbout && (
                    <button onClick={() => setIsEditingAbout(true)} className="text-blou-600 text-xs flex items-center font-semibold">
                        <Edit2 size={12} className="mr-1" /> Edit
                    </button>
                )}
                {isMe && isEditingAbout && (
                    <button onClick={handleSaveAbout} className="text-green-600 text-xs flex items-center font-semibold">
                        <Save size={12} className="mr-1" /> Save
                    </button>
                )}
            </div>
            {isEditingAbout ? (
                <textarea 
                    value={aboutText} 
                    onChange={(e) => setAboutText(e.target.value)}
                    className="w-full p-3 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blou-500 dark:text-white"
                    rows={3}
                    placeholder="Write something about yourself..."
                />
            ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {displayUser.about || "No bio yet."}
                </p>
            )}
        </div>
        
        {/* Stats (Moved DOWN) */}
        <div className="flex space-x-8 mt-6 py-4 border-y border-gray-100 dark:border-gray-800">
            <div className="text-center">
                <span className="block text-xl font-bold text-gray-900 dark:text-white">{displayUser.followers || 0}</span>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Followers</p>
            </div>
            <div className="text-center">
                <span className="block text-xl font-bold text-gray-900 dark:text-white">{displayUser.following || 0}</span>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Following</p>
            </div>
            <div className="text-center">
                <span className="block text-xl font-bold text-gray-900 dark:text-white">{displayUser.totalLikes || 0}</span>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Likes</p>
            </div>
        </div>

        {/* User Posts Section (Below Stats) */}
        <div className="mt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="px-1 py-4 flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">Posts</h3>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{posts.filter(p => p.userId === displayUser?.id).length}</span>
            </div>
            <Feed filterUserId={displayUser.id} isProfileView={true} />
        </div>
        
        {/* Footer Credit */}
        <div className="py-8 text-center">
            <p className="text-[10px] text-gray-400 font-mono tracking-widest">FROM RAFAPROJECT.0.0.1</p>
        </div>
      </div>
    </div>
  );
};
