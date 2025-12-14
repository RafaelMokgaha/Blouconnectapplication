
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { User, Post, Chat, Message, Comment, AppTab } from '../types';
import { MOCK_CHATS_INIT, MOCK_POSTS_INIT } from '../constants';
import { auth, db } from '../firebaseConfig';
import firebase from "firebase/compat/app";

interface AppContextType {
  // Auth & Settings
  user: User | null;
  login: (userData: User) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  toggleFollow: (userId: string) => void;
  isFollowing: (userId: string) => boolean;

  // View States
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  startChat: (targetUser: User) => void;

  viewingProfileId: string | null;
  viewProfile: (userId: string | null) => void;
  activeVillageFilter: string | null;
  setVillageFilter: (village: string | null) => void;

  // Data
  posts: Post[];
  addPost: (post: Post) => void;
  deletePost: (postId: string) => void;
  editPost: (postId: string, newContent: string) => void;
  addComment: (postId: string, comment: Comment) => void;
  repost: (post: Post) => void;
  reactToPost: (postId: string, emoji: string) => void;
  
  chats: Chat[];
  updateChatSettings: (chatId: string, settings: { wallpaper?: string, wallpaperOpacity?: number }) => void;
  messages: Record<string, Message[]>; // Kept for legacy/guest compatibility
  sendMessage: (chatId: string, message: Message, participants?: string[]) => void;
  markChatAsRead: (chatId: string) => void;
  clearChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  
  // UI State
  loading: boolean;
  totalUnreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: PropsWithChildren<{}>) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  
  // Filter State
  const [activeVillageFilter, setActiveVillageFilter] = useState<string | null>(null);
  
  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  
  // Computed State
  const totalUnreadCount = chats.reduce((acc, chat) => {
      const count = chat.unreadCounts?.[user?.id || ''] || 0;
      return acc + count;
  }, 0);

  useEffect(() => {
    // Theme Loading
    const storedTheme = localStorage.getItem('blou_theme');
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    // Firebase Auth Listener
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = db.collection("users").doc(firebaseUser.uid);
          const userDoc = await userDocRef.get();

          if (userDoc.exists) {
            const firestoreUser = userDoc.data() as User;
            setUser(firestoreUser);
            localStorage.setItem(`blou_user_${firebaseUser.uid}`, JSON.stringify(firestoreUser));
          } else {
             console.log("No Firestore record found for user. Waiting for profile setup.");
          }
        } catch (error: any) {
          // Graceful fallback if permission is denied (e.g. restrictive rules)
          if (error.code === 'permission-denied') {
              // Try local storage first
              const local = localStorage.getItem(`blou_user_${firebaseUser.uid}`);
              if (local) {
                  try { setUser(JSON.parse(local)); } catch(e) {}
              } else {
                  // Construct basic user from auth info so user is not stuck
                  const fallbackUser: User = {
                        id: firebaseUser.uid,
                        fullName: firebaseUser.displayName || 'Community Member',
                        email: firebaseUser.email || '',
                        village: 'Unknown',
                        avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                        dob: '',
                        isOnline: true,
                        followers: 0,
                        following: 0,
                        totalLikes: 0,
                        isVerified: false
                   };
                   setUser(fallbackUser);
              }
          } else {
              console.error("Error fetching user profile:", error);
          }
        }
      } else {
        const guestUser = localStorage.getItem('blou_guest_user');
        if (guestUser) {
            try {
                setUser(JSON.parse(guestUser));
            } catch (e) {
                setUser(null);
            }
        } else {
            setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- LOCAL STORAGE PERSISTENCE & SYNC ---
  
  // Helper to load data
  const loadLocalData = () => {
    // 1. Load Posts (Global, persists for all users on device for feed continuity)
    const savedPosts = localStorage.getItem('blou_posts');
    if (savedPosts) {
        try {
            const parsed = JSON.parse(savedPosts);
            setPosts(prev => {
                if (JSON.stringify(prev) !== savedPosts) return parsed;
                return prev;
            });
        } catch(e) { console.error("Error parsing posts", e); }
    }

    if (!user?.id) return;

    // 2. Load Chats
    const savedChats = localStorage.getItem(`blou_chats_${user.id}`);
    if (savedChats) {
        try {
            const parsed = JSON.parse(savedChats);
            setChats(prev => {
                if (JSON.stringify(prev) !== savedChats) return parsed;
                return prev;
            });
        } catch (e) {
            console.error("Failed to parse local chats", e);
        }
    }

    // 3. Load Messages
    const savedMessages = localStorage.getItem(`blou_messages_${user.id}`);
    if (savedMessages) {
        try {
            const parsedMsgs = JSON.parse(savedMessages);
            setMessages(prev => {
                if (JSON.stringify(prev) !== savedMessages) return parsedMsgs;
                return prev;
            });
        } catch (e) {
            console.error("Failed to parse local messages", e);
        }
    }
  };

  // Sync Logic: Initial + Events + Polling
  useEffect(() => {
      loadLocalData();

      // 1. Event Listener (Cross-Tab Sync)
      const handleStorageChange = (e: StorageEvent) => {
          if (e.key === `blou_chats_${user?.id}` || e.key === `blou_messages_${user?.id}` || e.key === 'blou_posts') {
              loadLocalData();
          }
      };
      window.addEventListener('storage', handleStorageChange);

      // 2. Polling (Guarantee Sync)
      const intervalId = setInterval(() => {
          loadLocalData();
      }, 1500);

      return () => {
          window.removeEventListener('storage', handleStorageChange);
          clearInterval(intervalId);
      };
  }, [user?.id]);

  // Persist Helper Functions
  const persistChats = (newChats: Chat[]) => {
      if (!user?.id) return;
      localStorage.setItem(`blou_chats_${user.id}`, JSON.stringify(newChats));
      setChats(newChats);
  };

  const persistMessages = (newMessages: Record<string, Message[]>) => {
      if (!user?.id) return;
      localStorage.setItem(`blou_messages_${user.id}`, JSON.stringify(newMessages));
      setMessages(newMessages);
  };

  // Persist Posts (Effect)
  useEffect(() => {
      if (posts.length > 0) {
          localStorage.setItem('blou_posts', JSON.stringify(posts));
      }
  }, [posts]);

  // --- FIRESTORE LISTENERS ---

  // 1. Chat Listener
  useEffect(() => {
    const currentUser = auth.currentUser;
    const isGuest = user?.id.startsWith('guest_');

    if (isGuest || !currentUser) return;

    const uid = currentUser.uid;

    const unsubscribe = db.collection('chats')
        .where('participants', 'array-contains', uid)
        .orderBy('lastMessageTime', 'desc')
        .limit(50)
        .onSnapshot(snapshot => {
            const loadedChats = snapshot.docs.map(doc => {
                const data = doc.data() as Chat;
                const otherId = data.participants.find(p => p !== uid) || uid;
                const otherUser = data.participantData?.[otherId];
                if (otherUser) {
                    data.name = otherUser.name;
                    data.avatar = otherUser.avatar;
                }
                data.wallpaper = data.wallpapers?.[uid];
                data.wallpaperOpacity = data.wallpaperOpacities?.[uid];
                return data;
            });

            setChats(prevChats => {
                const serverMap = new Map(loadedChats.map(c => [c.id, c]));
                const merged = [...loadedChats];
                prevChats.forEach(localChat => {
                    if (!serverMap.has(localChat.id)) merged.push(localChat);
                });
                return merged.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            });
        }, error => {
            if (error.code === 'permission-denied') console.debug("Offline mode active.");
        });

    return () => unsubscribe();
  }, [user]); 

  // 2. Post Listener (Real-time Community Feed)
  useEffect(() => {
     const currentUser = auth.currentUser;
     const isGuest = user?.id.startsWith('guest_');

     if (isGuest || !currentUser) return;
     
     const unsubscribe = db.collection('posts')
         .orderBy('timestamp', 'desc')
         .limit(50)
         .onSnapshot(snapshot => {
             const serverPosts = snapshot.docs.map(doc => doc.data() as Post);
             
             setPosts(prevPosts => {
                 // Merge strategy: Server wins for matching IDs, but keep local posts that haven't synced yet
                 const serverIds = new Set(serverPosts.map(p => p.id));
                 const localUnsynced = prevPosts.filter(p => !serverIds.has(p.id));
                 
                 // Combine and sort
                 const combined = [...serverPosts, ...localUnsynced].sort((a,b) => b.timestamp - a.timestamp);
                 
                 // Persist the combined state
                 localStorage.setItem('blou_posts', JSON.stringify(combined));
                 return combined;
             });
         }, error => {
             console.debug("Post listener error (likely permission or offline)", error);
         });
         
     return () => unsubscribe();
  }, [user]);


  const checkVerification = (u: User): boolean => {
      return (u.followers >= 1000 && (u.totalLikes || 0) >= 10000);
  };

  const login = async (userData: User) => {
    const userWithStats: User = {
        ...userData,
        followers: userData.followers || 0,
        following: userData.following || 0,
        followingIds: userData.followingIds || [],
        totalLikes: userData.totalLikes || 0,
        isVerified: false,
        banner: userData.banner || ''
    };

    if (checkVerification(userWithStats)) {
        userWithStats.isVerified = true;
    }

    setUser(userWithStats);

    if (userData.id.startsWith('guest_')) {
        localStorage.setItem('blou_guest_user', JSON.stringify(userWithStats));
        return;
    }

    try {
       await db.collection("users").doc(userData.id).set(userWithStats, { merge: true });
       localStorage.setItem(`blou_user_${userData.id}`, JSON.stringify(userWithStats));
    } catch (e: any) {
       if (e.code === 'permission-denied') {
           localStorage.setItem(`blou_user_${userData.id}`, JSON.stringify(userWithStats));
       }
    }
  };

  const logout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('blou_guest_user');
      setUser(null);
      setChats([]); // Clear chats on logout
    } catch (error) {
      console.error("Error signing out", error);
    }
  };
  
  const deleteAccount = async () => {
    if (!user) return;

    if (user.id.startsWith('guest_')) {
        localStorage.removeItem('blou_guest_user');
        setUser(null);
        return;
    }
    
    if (!auth.currentUser) return;
    
    try {
      const uid = user.id;
      await db.collection("users").doc(uid).delete();
      await auth.currentUser.delete();
      setUser(null);
      localStorage.removeItem(`blou_user_${uid}`);
    } catch (error) {
      console.error("Error deleting account", error);
    }
  };

  const updateUser = async (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data };
      updated.isVerified = checkVerification(updated);
      setUser(updated);
      
      if (user.id.startsWith('guest_')) {
          localStorage.setItem('blou_guest_user', JSON.stringify(updated));
      } else {
        try {
            await db.collection("users").doc(user.id).update(updated);
            localStorage.setItem(`blou_user_${user.id}`, JSON.stringify(updated));
        } catch (e: any) {
            if (e.code === 'permission-denied') {
                localStorage.setItem(`blou_user_${user.id}`, JSON.stringify(updated));
            }
        }
      }
      
      // Update local posts
      setPosts(prevPosts => prevPosts.map(p => {
        let updatedPost = { ...p };
        if (p.userId === updated.id) {
            updatedPost = { ...updatedPost, userName: updated.fullName, userAvatar: updated.avatar, userIsVerified: updated.isVerified, village: updated.village };
        }
        if (updatedPost.commentsList) {
            updatedPost.commentsList = updatedPost.commentsList.map(c => 
                c.userId === updated.id ? { ...c, userName: updated.fullName, userAvatar: updated.avatar } : c
            );
        }
        return updatedPost;
      }));
    }
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('blou_theme', newMode ? 'dark' : 'light');
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const isFollowing = (userId: string) => {
    return user?.followingIds?.includes(userId) || false;
  };

  const toggleFollow = (targetId: string) => {
    if (!user) return;
    const currentFollowing = user.followingIds || [];
    const isAlreadyFollowing = currentFollowing.includes(targetId);
    let newFollowingIds;
    let newCount = user.following;

    if (isAlreadyFollowing) {
        newFollowingIds = currentFollowing.filter(id => id !== targetId);
        newCount = Math.max(0, newCount - 1);
    } else {
        newFollowingIds = [...currentFollowing, targetId];
        newCount = newCount + 1;
    }

    updateUser({ following: newCount, followingIds: newFollowingIds });
  };

  const viewProfile = (userId: string | null) => {
    setViewingProfileId(userId);
  };

  const setVillageFilter = (village: string | null) => {
    setActiveVillageFilter(village);
    if(village) setActiveTab('discovery');
  };

  const startChat = async (targetUser: User) => {
    if (!user) return;
    const currentUid = auth.currentUser?.uid || user.id;

    if (targetUser.id === currentUid) return;

    // Create a consistent Chat ID
    const chatId = [currentUid, targetUser.id].sort().join('_');
    const existingChat = chats.find(c => c.id === chatId);

    // Guest Handling
    if (currentUid.startsWith('guest_') || !auth.currentUser) {
         if (!existingChat) {
             const mockChat: Chat = {
                id: chatId,
                type: 'private',
                participants: [currentUid, targetUser.id],
                lastMessage: 'Start a conversation',
                lastMessageTime: Date.now(),
                unreadCounts: {}, 
                participantData: {
                    [currentUid]: { name: user.fullName, avatar: user.avatar },
                    [targetUser.id]: { name: targetUser.fullName, avatar: targetUser.avatar }
                },
                name: targetUser.fullName,
                avatar: targetUser.avatar
             };
             persistChats([mockChat, ...chats]);
         }
         setActiveChatId(chatId);
         setActiveTab('chat');
         return;
    }
    
    // Optimistic UI update
    if (!existingChat) {
        const localChat: Chat = {
            id: chatId,
            type: 'private',
            name: targetUser.fullName, 
            avatar: targetUser.avatar,
            participants: [currentUid, targetUser.id],
            lastMessage: 'Start a conversation',
            lastMessageTime: Date.now(),
            unreadCounts: {},
            participantData: {
                [currentUid]: { name: user.fullName, avatar: user.avatar },
                [targetUser.id]: { name: targetUser.fullName, avatar: targetUser.avatar }
            }
        };
        persistChats([localChat, ...chats]);

        // Smart Background Create
        const chatRef = db.collection('chats').doc(chatId);
        try {
            const doc = await chatRef.get();
            if (!doc.exists) {
                 await chatRef.set({
                    id: chatId,
                    type: 'private',
                    participants: [currentUid, targetUser.id],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastMessage: 'Start a conversation',
                    lastMessageTime: Date.now(),
                    unreadCounts: { [currentUid]: 0, [targetUser.id]: 0 },
                    participantData: {
                        [currentUid]: { name: user.fullName, avatar: user.avatar },
                        [targetUser.id]: { name: targetUser.fullName, avatar: targetUser.avatar }
                    }
                });
            }
        } catch (e) {
            console.debug("Background chat create failed.", e);
        }
    }
    
    setActiveChatId(chatId);
    setActiveTab('chat');
  };

  const addPost = async (post: Post) => {
    const postWithVerification = { ...post, userIsVerified: user?.isVerified };
    
    // 1. Update Local State (Immediate Feedback)
    setPosts(prev => {
        const newPosts = [postWithVerification, ...prev];
        localStorage.setItem('blou_posts', JSON.stringify(newPosts));
        return newPosts;
    });

    // 2. Sync to Firestore (if valid user)
    if (user && !user.id.startsWith('guest_') && auth.currentUser) {
        try {
             // Firestore throws on 'undefined' values. We must strip them.
             // JSON.stringify/parse strips keys with undefined values
             const safePost = JSON.parse(JSON.stringify(postWithVerification));
             await db.collection('posts').doc(post.id).set(safePost);
        } catch (e) {
             console.error("Failed to sync post to cloud", e);
        }
    }
  };

  const deletePost = async (postId: string) => {
      // 1. Local
      setPosts(prev => {
          const newPosts = prev.filter(p => p.id !== postId);
          localStorage.setItem('blou_posts', JSON.stringify(newPosts));
          return newPosts;
      });

      // 2. Server
      if (user && !user.id.startsWith('guest_') && auth.currentUser) {
          try {
              await db.collection('posts').doc(postId).delete();
          } catch(e) { console.error("Error deleting post", e); }
      }
  };

  const editPost = async (postId: string, newContent: string) => {
      // 1. Local
      setPosts(prev => {
          const newPosts = prev.map(p => {
              if (p.id === postId) {
                  return { ...p, content: newContent, isEdited: true };
              }
              return p;
          });
          localStorage.setItem('blou_posts', JSON.stringify(newPosts));
          return newPosts;
      });

      // 2. Server
      if (user && !user.id.startsWith('guest_') && auth.currentUser) {
          try {
              await db.collection('posts').doc(postId).update({
                  content: newContent,
                  isEdited: true
              });
          } catch(e) { console.error("Error updating post", e); }
      }
  };

  const addComment = (postId: string, comment: Comment) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments + 1,
          commentsList: [...(p.commentsList || []), comment]
        };
      }
      return p;
    }));
  };

  const repost = (originalPost: Post) => {
    if (!user) return;
    const newPost: Post = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.fullName,
        userAvatar: user.avatar,
        userIsVerified: user.isVerified,
        village: user.village,
        category: originalPost.category,
        content: originalPost.content,
        mediaUrl: originalPost.mediaUrl,
        mediaType: originalPost.mediaType,
        timestamp: Date.now(),
        likes: 0,
        comments: 0,
        isRepost: true,
        originalAuthor: originalPost.userName,
        reactions: []
    };
    addPost(newPost);
  };

  const reactToPost = (postId: string, emoji: string) => {
      if (!user) return;
      setPosts(prev => prev.map(p => {
          if (p.id === postId) {
              const currentReactions = p.reactions || [];
              const existingIndex = currentReactions.findIndex(r => r.userId === user.id);
              let newReactions = [...currentReactions];

              if (existingIndex >= 0) {
                  if (currentReactions[existingIndex].emoji === emoji) {
                      newReactions.splice(existingIndex, 1);
                  } else {
                      newReactions[existingIndex] = { userId: user.id, emoji };
                  }
              } else {
                  newReactions.push({ userId: user.id, emoji });
              }
              
              return { ...p, reactions: newReactions, likes: newReactions.length };
          }
          return p;
      }));
  };

  const updateChatSettings = async (chatId: string, settings: { wallpaper?: string, wallpaperOpacity?: number }) => {
    if (!user) return;
    
    const updatedChats = chats.map(c => {
        if (c.id === chatId) {
            return {
                ...c,
                wallpaper: settings.wallpaper ?? c.wallpaper,
                wallpaperOpacity: settings.wallpaperOpacity ?? c.wallpaperOpacity
            };
        }
        return c;
    });
    persistChats(updatedChats);

    if (user.id.startsWith('guest_') || !auth.currentUser) return;
    
    // Updates Remote
    const updateData: any = {};
    if (settings.wallpaper !== undefined) {
        updateData[`wallpapers.${user.id}`] = settings.wallpaper;
    }
    if (settings.wallpaperOpacity !== undefined) {
        updateData[`wallpaperOpacities.${user.id}`] = settings.wallpaperOpacity;
    }

    try {
        await db.collection('chats').doc(chatId).update(updateData);
    } catch (e: any) {
        console.warn("Chat settings update failed on server.", e);
    }
  };

  const clearChat = (chatId: string) => {
      const newState = { ...messages };
      delete newState[chatId];
      persistMessages(newState);
  };

  const deleteChat = (chatId: string) => {
     if(!user) return;
     persistChats(chats.filter(c => c.id !== chatId));
     clearChat(chatId);
  };

  const markChatAsRead = async (chatId: string) => {
      if (!user) return;
      const currentUid = user.id;

      // 1. Local update for instant UI feedback
      const updatedChats = chats.map(c => {
          if (c.id === chatId) {
              const newCounts = { ...(c.unreadCounts || {}) };
              newCounts[currentUid] = 0;
              return { ...c, unreadCounts: newCounts };
          }
          return c;
      });
      persistChats(updatedChats);

      // 2. Server update (skip for guests)
      if (!currentUid.startsWith('guest_') && auth.currentUser) {
          try {
              const updateData: any = {};
              updateData[`unreadCounts.${currentUid}`] = 0;
              await db.collection('chats').doc(chatId).update(updateData);
          } catch (e) {
              console.warn("Failed to mark chat as read on server", e);
          }
      }
  };

  const sendMessage = async (chatId: string, message: Message, explicitParticipants?: string[]) => {
    const currentUid = auth.currentUser?.uid || user?.id;
    const isGuest = currentUid?.startsWith('guest_') || !auth.currentUser;

    // Identify the recipient to increment their unread count
    const parts = chatId.split('_');
    const recipientId = explicitParticipants?.find(p => p !== currentUid) || parts.find(p => p !== currentUid) || '';

    // 1. LOCAL / GUEST HANDLING (SIMULATED SERVER PUSH)
    if (isGuest || !currentUid) {
        // A. Update Sender's View (My messages)
        const newState = {
            ...messages,
            [chatId]: [...(messages[chatId] || []), message]
        };
        persistMessages(newState);

        // B. Update Sender's Chat List
        const updatedChats = chats.map(c => {
             if (c.id === chatId) {
                 return {
                     ...c,
                     lastMessage: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                     lastMessageTime: message.timestamp
                 };
             }
             return c;
        }).sort((a,b) => b.lastMessageTime - a.lastMessageTime);
        persistChats(updatedChats);

        // C. SIMULATE SERVER PUSH TO RECIPIENT (Cross-Tab Sync)
        if (recipientId) {
            try {
                // 1. Push Message content to recipient's storage
                const recipientMsgsKey = `blou_messages_${recipientId}`;
                const rMsgsStr = localStorage.getItem(recipientMsgsKey) || '{}';
                const rMsgs = JSON.parse(rMsgsStr);
                rMsgs[chatId] = [...(rMsgs[chatId] || []), message];
                localStorage.setItem(recipientMsgsKey, JSON.stringify(rMsgs));

                // 2. Update Recipient's Chat List (Increment Unread)
                const recipientChatsKey = `blou_chats_${recipientId}`;
                const rChatsStr = localStorage.getItem(recipientChatsKey) || '[]';
                let rChats: Chat[] = JSON.parse(rChatsStr);
                
                const existingIndex = rChats.findIndex(c => c.id === chatId);
                if (existingIndex >= 0) {
                    const existingChat = rChats[existingIndex];
                    const newUnread = (existingChat.unreadCounts?.[recipientId] || 0) + 1;
                    
                    rChats[existingIndex] = {
                        ...existingChat,
                        lastMessage: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                        lastMessageTime: message.timestamp,
                        unreadCounts: { ...existingChat.unreadCounts, [recipientId]: newUnread }
                    };
                } else {
                    // Create chat for recipient if it doesn't exist
                    const senderData = user; // Current user is sender
                    if (senderData) {
                        const newChat: Chat = {
                            id: chatId,
                            type: 'private',
                            participants: [currentUid, recipientId],
                            name: senderData.fullName, // Recipient sees Sender name
                            avatar: senderData.avatar, // Recipient sees Sender avatar
                            lastMessage: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                            lastMessageTime: message.timestamp,
                            unreadCounts: { [recipientId]: 1 },
                            participantData: {
                                [currentUid]: { name: senderData.fullName, avatar: senderData.avatar },
                                [recipientId]: { name: 'You', avatar: '' }
                            }
                        };
                        rChats.push(newChat);
                    }
                }
                // Sort
                rChats.sort((a,b) => b.lastMessageTime - a.lastMessageTime);
                localStorage.setItem(recipientChatsKey, JSON.stringify(rChats));

            } catch (e) {
                console.warn("Failed to push message to recipient storage (Simulated Server Error)", e);
            }
        }
        return;
    }

    // 2. AUTHENTICATED USERS (Real Server)
    try {
        const newState = {
            ...messages,
            [chatId]: [...(messages[chatId] || []), message]
        };
        setMessages(newState); // Local only, waiting for DB
        
        setChats(prev => {
            const existingIndex = prev.findIndex(c => c.id === chatId);
            let newChats = [...prev];
            if (existingIndex > -1) {
                const updatedChat = {
                    ...newChats[existingIndex],
                    lastMessage: message.type === 'text' ? message.content : `Sent a ${message.type}`,
                    lastMessageTime: message.timestamp
                };
                newChats[existingIndex] = updatedChat;
            }
            return newChats.sort((a,b) => b.lastMessageTime - a.lastMessageTime);
        });

        const batch = db.batch();
        const chatRef = db.collection('chats').doc(chatId);
        const msgRef = chatRef.collection('messages').doc(message.id);
        
        let shouldWriteImmutables = false;
        const isKnownLocal = chats.some(c => c.id === chatId);

        if (!isKnownLocal) {
             try {
                 const chatDoc = await chatRef.get();
                 shouldWriteImmutables = !chatDoc.exists;
             } catch (e) {
                 shouldWriteImmutables = false; 
             }
        }
        
        let chatUpdateData: any = {
            id: chatId,
            lastMessage: message.type === 'text' ? message.content : `Sent a ${message.type}`,
            lastMessageTime: message.timestamp,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Increment recipient unread count
        if (recipientId) {
             chatUpdateData[`unreadCounts.${recipientId}`] = firebase.firestore.FieldValue.increment(1);
        }

        if (shouldWriteImmutables) {
            let participants = explicitParticipants || [];
            if (participants.length === 0) {
                 const parts = chatId.split('_');
                 participants = parts.length === 2 ? parts : [currentUid];
            }
            if (!participants.includes(currentUid)) participants.push(currentUid);

            chatUpdateData.participants = participants;
            chatUpdateData.type = 'private';
            chatUpdateData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            chatUpdateData.participantData = {
                [currentUid]: { name: user?.fullName || 'User', avatar: user?.avatar || '' }
            };
            // Initial counts
            chatUpdateData.unreadCounts = {
                [currentUid]: 0,
                [recipientId]: 1
            };
        }

        batch.set(msgRef, message);
        batch.set(chatRef, chatUpdateData, { merge: true });

        await batch.commit();

    } catch (error: any) {
        console.error("Error sending message:", error);
    }
  };

  return (
    <AppContext.Provider value={{
      user, login, logout, updateUser, deleteAccount,
      isDarkMode, toggleDarkMode, toggleFollow, isFollowing,
      activeTab, setActiveTab, activeChatId, setActiveChatId, startChat,
      viewingProfileId, viewProfile, activeVillageFilter, setVillageFilter,
      posts, addPost, addComment, deletePost, editPost, repost, reactToPost,
      chats, messages, sendMessage, markChatAsRead, updateChatSettings, clearChat, deleteChat,
      loading, totalUnreadCount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
