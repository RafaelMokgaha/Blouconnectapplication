
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Chat, Message, User } from '../types';
import { ArrowLeft, Send, Mic, Image as ImageIcon, Smile, MoreVertical, X, Settings, User as UserIcon, StopCircle, Trash2, Eraser, Wallpaper, Loader2, UserPlus, Search } from 'lucide-react';
import { EmojiPicker } from '../components/EmojiPicker';
import { uploadFile } from '../utils/storage';
import { db, auth } from '../firebaseConfig';

export const ChatSection = () => {
  const { chats, user, sendMessage, updateChatSettings, toggleFollow, clearChat, deleteChat, isFollowing, viewProfile, activeChatId, setActiveChatId, posts, startChat, markChatAsRead } = useApp();
  
  // New Chat / Search State
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [listSearchTerm, setListSearchTerm] = useState(''); // Search within existing chats
  const [userResults, setUserResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter existing chats
  const filteredChats = chats.filter(c => 
      c.name.toLowerCase().includes(listSearchTerm.toLowerCase())
  );

  // Load suggestions (Community Members) when modal opens or search is cleared
  useEffect(() => {
    if (showNewChat && !searchTerm && user) {
        const fetchCommunity = async () => {
            setIsSearching(true);
            try {
                const userMap = new Map<string, User>();
                // 1. Add users from local posts (fastest)
                posts.forEach(p => {
                     if (p.userId !== user.id) {
                         userMap.set(p.userId, {
                            id: p.userId,
                            fullName: p.userName,
                            avatar: p.userAvatar,
                            village: p.village,
                            isVerified: p.userIsVerified,
                            email: '', dob: '', isOnline: false, followers: 0, following: 0
                         } as User);
                     }
                });

                // 2. Fetch registered users from Firestore (ONLY IF NOT GUEST AND AUTHENTICATED)
                if (!user.id.startsWith('guest_') && auth.currentUser) {
                    try {
                        const snapshot = await db.collection('users').limit(20).get();
                        snapshot.docs.forEach(doc => {
                            const u = doc.data() as User;
                            if (u.id !== user.id) userMap.set(u.id, u);
                        });
                    } catch(err) {
                        // Ignore permission errors
                    }
                }
                
                setUserResults(Array.from(userMap.values()));
            } catch (error) {
                console.warn("Error fetching community members:", error);
            } finally {
                setIsSearching(false);
            }
        };
        fetchCommunity();
    }
  }, [showNewChat, searchTerm, user]);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) return;
    setIsSearching(true);
    
    // 1. Local Search
    const localUsersMap = new Map<string, User>();
    const lowerTerm = term.toLowerCase();
    posts.forEach(p => {
        if (!localUsersMap.has(p.userId) && p.userName.toLowerCase().includes(lowerTerm)) {
            localUsersMap.set(p.userId, {
                id: p.userId,
                fullName: p.userName,
                avatar: p.userAvatar,
                village: p.village,
                isVerified: p.userIsVerified,
                email: '', dob: '', isOnline: false, followers: 0, following: 0
            } as User);
        }
    });
    let combinedResults = Array.from(localUsersMap.values());

    // 2. Firestore Search (ONLY IF NOT GUEST AND AUTHENTICATED)
    if (!user?.id.startsWith('guest_') && auth.currentUser) {
        try {
            const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();
            const queries = [
                db.collection('users').where('fullName', '>=', term).where('fullName', '<=', term + '\uf8ff').limit(5).get()
            ];
            if (capitalizedTerm !== term) {
                queries.push(db.collection('users').where('fullName', '>=', capitalizedTerm).where('fullName', '<=', capitalizedTerm + '\uf8ff').limit(5).get());
            }
            
            const snapshots = await Promise.all(queries);
            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => {
                    const u = doc.data() as User;
                    if (u.id !== user?.id && !localUsersMap.has(u.id) && !combinedResults.find(e => e.id === u.id)) {
                        combinedResults.push(u);
                    }
                });
            });
        } catch (e) {
            // Ignore errors
        }
    }
    
    setUserResults(combinedResults);
    setIsSearching(false);
  };

  const handleOpenChat = (chatId: string) => {
      markChatAsRead(chatId);
      setActiveChatId(chatId);
  };

  if (activeChatId) {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) {
        // Fallback for safety if chat ID exists but chat data not loaded yet
        return <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>;
    }
    return (
        <ChatRoom 
            chat={activeChat} 
            onBack={() => setActiveChatId(null)} 
            // CRITICAL FIX: Pass participants explicitly to ensure correct creation of chat doc if missing
            onSend={(msg) => sendMessage(activeChat.id, msg, activeChat.participants)} 
            currentUserId={user?.id || ''}
            onUpdateSettings={(s) => updateChatSettings(activeChat.id, s)}
            onFollow={() => toggleFollow(activeChat.participants.find(p => p !== user?.id) || '')}
            isFollowing={isFollowing(activeChat.participants.find(p => p !== user?.id) || '')}
            onClear={() => clearChat(activeChat.id)}
            onDelete={() => { deleteChat(activeChat.id); setActiveChatId(null); }}
            onViewProfile={() => viewProfile(activeChat.participants.find(p => p !== user?.id) || null)} 
            onMarkRead={() => markChatAsRead(activeChat.id)}
        />
    );
  }

  return (
    <div className="pt-4 pb-20 relative flex flex-col h-full">
      <div className="px-4 mb-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-blou-900 dark:text-white">Chats</h1>
        <button 
            onClick={() => setShowNewChat(true)}
            className="p-2 bg-blou-100 dark:bg-gray-800 text-blou-600 dark:text-blou-400 rounded-full hover:bg-blou-200 dark:hover:bg-gray-700 transition-colors shadow-sm"
        >
            <UserPlus size={20} />
        </button>
      </div>

      {/* Local Chat Search Bar */}
      {chats.length > 0 && (
          <div className="px-4 mb-2 flex-shrink-0">
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input 
                      className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none dark:text-white text-sm"
                      placeholder="Search chats..."
                      value={listSearchTerm}
                      onChange={(e) => setListSearchTerm(e.target.value)}
                  />
                  {listSearchTerm && (
                      <button 
                        onClick={() => setListSearchTerm('')} 
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                          <X size={16} />
                      </button>
                  )}
              </div>
          </div>
      )}
      
      {/* New Chat / Search Modal Overlay */}
      {showNewChat && (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-slide-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-3 bg-white dark:bg-gray-900">
                <button onClick={() => { setShowNewChat(false); setSearchTerm(''); }} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        autoFocus
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl focus:outline-none dark:text-white"
                        placeholder="Search for people..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blou-600" /></div>
                ) : userResults.length > 0 ? (
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            {searchTerm ? 'Search Results' : 'Community Members'}
                        </h3>
                        {userResults.map(u => (
                            <button 
                                key={u.id}
                                onClick={() => {
                                    startChat(u);
                                    setShowNewChat(false);
                                    setSearchTerm('');
                                }}
                                className="w-full flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                                <img src={u.avatar} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                <div className="ml-3">
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{u.fullName}</h4>
                                    <p className="text-xs text-gray-500">{u.village}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-gray-400">
                        <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No users found.</p>
                        <p className="text-xs opacity-70 mt-1">Try searching for a name</p>
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 mt-10">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <UserPlus size={32} />
                </div>
                <p>No active chats.</p>
                <button 
                    onClick={() => setShowNewChat(true)}
                    className="mt-4 text-blou-600 font-semibold text-sm hover:underline"
                >
                    Start a new conversation
                </button>
            </div>
        ) : filteredChats.length === 0 ? (
             <div className="text-center py-8 text-gray-400">
                 No chats match "{listSearchTerm}"
             </div>
        ) : filteredChats.map(chat => {
            const unreadCount = chat.unreadCounts?.[user?.id || ''] || 0;
            return (
              <div 
                key={chat.id} 
                onClick={() => handleOpenChat(chat.id)}
                className="flex items-center px-4 py-3 bg-white dark:bg-gray-900 active:bg-gray-100 dark:active:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="relative">
                  <img src={chat.avatar} className="w-12 h-12 rounded-lg object-cover" />
                  {/* UNREAD BADGE - HIGH Z-INDEX & VISIBILITY */}
                  {unreadCount > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 z-10 bg-red-600 text-white text-[10px] font-bold h-5 min-w-[20px] px-1 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-900 shadow-sm animate-bounce-short">
                          {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                  )}
                </div>
                <div className="ml-3 flex-1 overflow-hidden">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-base truncate pr-2 ${unreadCount > 0 ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-900 dark:text-white'}`}>
                        {chat.name}
                    </h3>
                    <span className={`text-[10px] flex-shrink-0 ${unreadCount > 0 ? 'text-blou-600 font-bold' : 'text-gray-400'}`}>
                      {new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className={`text-sm truncate font-normal ${unreadCount > 0 ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {chat.lastMessage}
                  </p>
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

// Sub-component: Individual Chat Room
const ChatRoom = ({ 
    chat, 
    onBack, 
    onSend, 
    currentUserId,
    onUpdateSettings,
    onFollow,
    isFollowing,
    onClear,
    onDelete,
    onViewProfile,
    onMarkRead
}: { 
    chat: Chat, 
    onBack: () => void, 
    onSend: (m: Message) => void, 
    currentUserId: string,
    onUpdateSettings: (settings: { wallpaper?: string, wallpaperOpacity?: number }) => void,
    onFollow: () => void,
    isFollowing: boolean,
    onClear: () => void,
    onDelete: () => void,
    onViewProfile: () => void,
    onMarkRead: () => void
}) => {
  // Use App Context for guest messages lookup and backend availability
  const { messages } = useApp();
  
  const [text, setText] = useState('');
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [uploading, setUploading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Auto-read logic: If new messages come in, mark them as read immediately since user is viewing
  useEffect(() => {
     if (chat.unreadCounts?.[currentUserId] && chat.unreadCounts[currentUserId] > 0) {
         onMarkRead();
     }
  }, [chat.unreadCounts, currentUserId]);

  // Subscribe to live messages
  useEffect(() => {
    // 1. Initial Load from Local Context (Fastest, handles Guest + Fallback history)
    const localMsgs = messages[chat.id] || [];
    if (localMsgs.length > 0) {
        setLiveMessages(localMsgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }

    // 2. If Guest, we are done.
    if (currentUserId.startsWith('guest_') || !auth.currentUser) {
        return;
    }

    // 3. If Auth, try to listen to Firestore
    const unsubscribe = db.collection('chats').doc(chat.id).collection('messages')
      .orderBy('timestamp', 'asc')
      .onSnapshot(snapshot => {
         const msgs = snapshot.docs.map(d => d.data() as Message);
         // If remote is empty but local has messages, we might have permission issues or lag, keep local
         if (msgs.length === 0 && localMsgs.length > 0) return;
         
         setLiveMessages(msgs);
         setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
         // Also mark as read here if actively listening
         onMarkRead();
      }, err => {
          // 4. Permission Error Handling
          if (err.code === 'permission-denied' || err.message?.toLowerCase().includes('permission')) {
              // Gracefully handle denial by falling back to local messages silently
              if (messages[chat.id]) {
                  setLiveMessages(messages[chat.id]);
              }
              return;
          }
          console.error("Error fetching messages:", err);
      });
      
    return () => unsubscribe();
  }, [chat.id, currentUserId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const handleSendText = () => {
    if (!text.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      content: text,
      type: 'text',
      timestamp: Date.now()
    };
    
    onSend(newMessage);
    setText('');
    setShowEmoji(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const type = file.type.startsWith('video') ? 'video' : 'image';
          setUploading(true);
          try {
             // For guest users, the uploadFile util will mock the response, preventing errors
             const url = await uploadFile(file, currentUserId, `Chat Attachment: ${file.name}`);
             const newMessage: Message = {
                id: Date.now().toString(),
                senderId: currentUserId,
                content: url,
                type: type,
                timestamp: Date.now()
             };
             onSend(newMessage);
          } catch (error) {
             console.error("Upload error", error);
             alert("Failed to send file.");
          } finally {
             setUploading(false);
          }
      }
  };

  const handleWallpaperChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          try {
             const url = await uploadFile(file, currentUserId, 'Chat Wallpaper');
             onUpdateSettings({ wallpaper: url });
          } catch (error) {
             console.error("Wallpaper upload failed", error);
          }
      }
  };

  // Voice Recording
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const file = new File([blob], "voice_note.webm", { type: "audio/webm" });
            try {
                const url = await uploadFile(file, currentUserId, 'Voice Note');
                const newMessage: Message = {
                    id: Date.now().toString(),
                    senderId: currentUserId,
                    content: url,
                    type: 'voice',
                    timestamp: Date.now(),
                    duration: '0:05' 
                };
                onSend(newMessage);
            } catch(e) {
                console.error("Failed to upload voice note", e);
            }
            stream.getTracks().forEach(t => t.stop());
        };
        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
    } catch (err) {
        console.error("Mic error", err);
        alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
      if(mediaRecorder && isRecording) {
          mediaRecorder.stop();
          setIsRecording(false);
          setMediaRecorder(null);
      }
  };

  return (
    <div className="flex flex-col h-full relative z-50 overflow-hidden">
      
      {/* Background with Opacity */}
      <div 
        className="absolute inset-0 z-0 bg-repeat transition-all duration-300"
        style={{
            backgroundColor: '#ededed', 
            backgroundImage: chat.wallpaper ? `url(${chat.wallpaper})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: chat.wallpaper ? (chat.wallpaperOpacity || 0.5) : 1
        }}
      />
      {/* Dark mode overlay */}
      <div className="absolute inset-0 z-0 bg-black/0 dark:bg-black/50 pointer-events-none"></div>

      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-between shadow-sm border-b border-gray-200 dark:border-gray-800 relative z-20">
        <div className="flex items-center cursor-pointer" onClick={() => setShowProfile(true)}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="mr-3 text-gray-700 dark:text-white">
            <ArrowLeft size={24} />
          </button>
          <img src={chat.avatar} className="w-9 h-9 rounded-full object-cover mr-3" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white leading-tight">{chat.name}</h2>
            <span className="text-[10px] text-green-500">Online</span>
          </div>
        </div>
        
        {/* Settings Icon */}
        <button onClick={() => setShowSettings(!showSettings)} className="text-gray-600 dark:text-gray-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
           <MoreVertical size={20} />
        </button>
        
        {/* Professional Settings Modal - CENTERED & HIGH Z-INDEX */}
        {showSettings && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                
                {/* Modal Content */}
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl relative z-10 overflow-hidden animate-slide-up mx-auto">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                            <Settings size={18} className="mr-2" /> 
                            Chat Options
                        </h3>
                        <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-800"><X size={20}/></button>
                    </div>

                    <div className="p-2 space-y-1">
                        <button 
                            onClick={() => wallpaperInputRef.current?.click()} 
                            className="w-full flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
                        >
                            <div className="w-10 h-10 rounded-full bg-blou-100 dark:bg-gray-700 text-blou-600 flex items-center justify-center mr-3">
                                <Wallpaper size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-sm dark:text-white">Change Wallpaper</p>
                                <p className="text-xs text-gray-500">Custom background for this chat</p>
                            </div>
                        </button>
                        <input type="file" ref={wallpaperInputRef} className="hidden" accept="image/*" onChange={handleWallpaperChange} />

                        {chat.wallpaper && (
                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg mx-2 mb-2">
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs text-gray-500 font-bold uppercase">Opacity</label>
                                    <span className="text-xs text-gray-400">{Math.round((chat.wallpaperOpacity || 0.5) * 100)}%</span>
                                </div>
                                <input 
                                    type="range" min="0.1" max="1" step="0.1" 
                                    value={chat.wallpaperOpacity || 0.5} 
                                    onChange={(e) => onUpdateSettings({ wallpaperOpacity: parseFloat(e.target.value) })}
                                    className="w-full accent-blou-600 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-2 mx-3"></div>

                        <button 
                             onClick={() => { onClear(); setShowSettings(false); }}
                             className="w-full flex items-center p-3 hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl transition-colors text-left text-orange-600"
                        >
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mr-3">
                                <Eraser size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Clear Chat</p>
                                <p className="text-xs opacity-70">Delete messages for me</p>
                            </div>
                        </button>

                        <button 
                             onClick={() => { onDelete(); setShowSettings(false); }}
                             className="w-full flex items-center p-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors text-left text-red-600"
                        >
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mr-3">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <p className="font-semibold text-sm">Delete Chat</p>
                                <p className="text-xs opacity-70">Remove conversation completely</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 z-10">
        {liveMessages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${
                isMe 
                ? 'bg-blou-500 text-white rounded-xl rounded-tr-none' 
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl rounded-tl-none shadow-sm'
              } p-2`}>
                {msg.type === 'text' && <div className="px-2 py-1 text-sm">{msg.content}</div>}
                {msg.type === 'image' && <img src={msg.content} className="rounded-lg max-h-60" />}
                {msg.type === 'video' && <video src={msg.content} controls className="rounded-lg max-h-60 bg-black" />}
                {msg.type === 'voice' && (
                    <div className="flex items-center space-x-2 px-2 py-1">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <Mic size={16} />
                        </div>
                        <audio src={msg.content} controls className="h-6 w-32" />
                    </div>
                )}
                
                <div className={`text-[9px] mt-1 text-right px-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-xl rounded-tl-none shadow-sm flex space-x-1">
               <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
               <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
               <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input & Emoji Container */}
      <div className="flex flex-col flex-shrink-0 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-20">
        <div className="p-2">
            <div className="flex items-center space-x-2">
                {isRecording ? (
                    <button onClick={stopRecording} className="p-2 text-red-500 animate-pulse bg-red-100 dark:bg-red-900/30 rounded-full"><StopCircle size={24} /></button>
                ) : (
                    <button onClick={startRecording} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><Mic size={24} /></button>
                )}
                
                <div className="flex-1 relative">
                    <input 
                        value={text}
                        onChange={e => setText(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 rounded-full border-none focus:ring-0 bg-white dark:bg-gray-800 dark:text-white shadow-sm"
                        placeholder={isRecording ? "Recording..." : "Message..."}
                        onKeyDown={e => e.key === 'Enter' && handleSendText()}
                        disabled={isRecording}
                        onClick={() => setShowEmoji(false)}
                    />
                    <button onClick={() => setShowEmoji(!showEmoji)} className={`absolute right-3 top-2.5 hover:text-yellow-500 transition-colors ${showEmoji ? 'text-yellow-500' : 'text-gray-400'}`}><Smile size={20} /></button>
                </div>
                
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><ImageIcon size={24} /></button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
                
                {uploading ? (
                   <Loader2 className="animate-spin text-blou-600 m-2" />
                ) : text.length > 0 && (
                    <button onClick={handleSendText} className="p-2 bg-blou-600 hover:bg-blou-700 text-white rounded-full animate-fade-in shadow-md"><Send size={20} /></button>
                )}
            </div>
        </div>
        
        {/* Emoji Picker Section */}
        {showEmoji && (
           <div className="h-64 border-t border-gray-200 dark:border-gray-800">
               <EmojiPicker onEmojiClick={(emoji) => setText(prev => prev + emoji)} />
           </div>
        )}
      </div>
    </div>
  );
};
