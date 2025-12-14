
export interface User {
  id: string;
  fullName: string;
  email?: string; // Added email field
  phoneNumber?: string;
  village: string;
  avatar: string;
  banner?: string;
  about?: string;
  dob: string;
  isOnline: boolean;
  followers: number;
  following: number;
  followingIds?: string[]; // List of IDs this user follows
  totalLikes?: number; // Total likes received on posts
  isVerified?: boolean;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
}

export type PostCategory = 'General' | 'Funerals' | 'Events' | 'Sports';

export interface Reaction {
  userId: string;
  emoji: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userIsVerified?: boolean;
  village: string;
  category?: PostCategory;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: number;
  likes: number;
  reactions?: Reaction[];
  comments: number;
  commentsList?: Comment[];
  isRepost?: boolean;
  originalAuthor?: string;
  isEdited?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  content: string; // text or url if media
  type: 'text' | 'image' | 'video' | 'voice';
  timestamp: number;
  duration?: string; // for voice notes
}

export interface Chat {
  id: string;
  name: string; // Display name (dynamic based on user view)
  avatar: string; // Display avatar (dynamic based on user view)
  type: 'private' | 'group';
  lastMessage: string;
  lastMessageTime: number;
  unreadCounts?: Record<string, number>; // Map userId -> count of unread messages
  participants: string[];
  participantData?: Record<string, { name: string, avatar: string }>; // Cache user info
  wallpapers?: Record<string, string>; // Map userId -> wallpaperUrl
  wallpaperOpacities?: Record<string, number>; // Map userId -> opacity
  wallpaper?: string; // Computed property for current user view
  wallpaperOpacity?: number; // Computed property for current user view
}

export type ViewState = 'splash' | 'auth' | 'app';
export type AppTab = 'home' | 'discovery' | 'chat' | 'profile';
