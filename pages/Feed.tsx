
import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { MapPin, MessageSquare, Heart, Send, Repeat, Plus, X, Smile, BadgeCheck, MoreVertical, Trash2, Edit2, Check } from 'lucide-react';
import { Post } from '../types';
import { EmojiPicker } from '../components/EmojiPicker';

export const Feed = ({ 
    filterCategory, 
    filterVillage, 
    filterUserId,
    isProfileView = false 
}: { 
    filterCategory?: string, 
    filterVillage?: string | null,
    filterUserId?: string,
    isProfileView?: boolean
}) => {
  const { posts, user, addComment, repost, reactToPost, isFollowing, toggleFollow, viewProfile, deletePost, editPost } = useApp();
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [reactingPostId, setReactingPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Edit & Menu State
  const [showMenuPostId, setShowMenuPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Filter Logic
  let filteredPosts = posts;
  if (filterUserId) filteredPosts = filteredPosts.filter(p => p.userId === filterUserId);
  if (filterCategory) filteredPosts = filteredPosts.filter(p => p.category === filterCategory);
  if (filterVillage) filteredPosts = filteredPosts.filter(p => p.village === filterVillage);

  const handleCommentSubmit = (postId: string) => {
    if (!commentText.trim() || !user) return;
    addComment(postId, {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.fullName,
        userAvatar: user.avatar,
        content: commentText,
        timestamp: Date.now()
    });
    setCommentText('');
    setShowEmojiPicker(false);
  };

  const handleEmojiSelect = (emoji: string) => {
      if (reactingPostId) {
          reactToPost(reactingPostId, emoji);
          setReactingPostId(null);
      }
  };

  const startEditing = (post: Post) => {
      setEditingPostId(post.id);
      setEditContent(post.content);
      setShowMenuPostId(null);
  };

  const saveEdit = (postId: string) => {
      if (editContent.trim()) {
          editPost(postId, editContent);
          setEditingPostId(null);
          setEditContent('');
      }
  };

  const handleDelete = (postId: string) => {
      if (window.confirm("Are you sure you want to delete this post?")) {
          deletePost(postId);
      }
      setShowMenuPostId(null);
  };

  return (
    <div className={isProfileView ? "" : "pt-4 pb-20"}>
      
      {/* Reaction Picker Modal */}
      {reactingPostId && (
          <div 
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" 
            onClick={() => setReactingPostId(null)}
          >
             <div 
                className="bg-white dark:bg-gray-800 w-full sm:w-96 h-[60vh] rounded-t-2xl sm:rounded-2xl overflow-hidden animate-slide-up flex flex-col shadow-2xl" 
                onClick={e => e.stopPropagation()}
             >
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <span className="font-bold text-lg dark:text-white">Choose a Reaction</span>
                    <button onClick={() => setReactingPostId(null)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 transition-colors">
                        <X size={16} className="dark:text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <EmojiPicker onEmojiClick={handleEmojiSelect} />
                </div>
             </div>
          </div>
      )}

      {/* Header - Only show if NOT in profile view */}
      {!isProfileView && (
        <div className="px-4 mb-4">
            <div>
            <h1 className="text-2xl font-bold text-blou-900 dark:text-white">
                {filterVillage ? filterVillage : (filterCategory ? filterCategory : 'Community')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
                {filterVillage ? `Trending in ${filterVillage}` : (filterCategory ? `Latest posts in ${filterCategory}` : `What's happening in ${user?.village}`)}
            </p>
            </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-2">
        {filteredPosts.map(post => {
          const amIFollowing = isFollowing(post.userId);
          const isMe = user?.id === post.userId;
          const myReaction = post.reactions?.find(r => r.userId === user?.id);

          return (
            <div key={post.id} className="bg-white dark:bg-gray-800 mb-2 border-b border-gray-100 dark:border-gray-700 relative">
            {post.isRepost && (
                <div className="flex items-center text-xs text-gray-500 mb-2 ml-4 mt-2">
                    <Repeat size={12} className="mr-1" />
                    <span>{post.userName} reposted</span>
                </div>
            )}
            
            <div className="p-4 pb-2">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                        <img 
                            src={post.userAvatar} 
                            className="w-10 h-10 rounded-full object-cover cursor-pointer" 
                            onClick={() => viewProfile(post.userId)}
                        />
                        <div>
                            <div className="flex items-center">
                                <h3 
                                    className="font-semibold text-gray-900 dark:text-white leading-tight mr-1 cursor-pointer hover:underline flex items-center"
                                    onClick={() => viewProfile(post.userId)}
                                >
                                    {post.isRepost && post.originalAuthor ? post.originalAuthor : post.userName}
                                </h3>
                                {/* Verification Badge */}
                                {post.userIsVerified && (
                                    <div className="relative w-4 h-4 mr-2 flex items-center justify-center">
                                        <div className="absolute inset-0 bg-blou-500 rounded-full"></div>
                                        <BadgeCheck size={16} className="text-white fill-blou-500 relative z-10" />
                                    </div>
                                )}

                                {!isMe && !amIFollowing && (
                                    <button 
                                        onClick={() => toggleFollow(post.userId)}
                                        className="text-[10px] font-bold text-blou-600 border border-blou-600 px-2 py-0.5 rounded-full hover:bg-blou-50 transition-colors ml-1"
                                    >
                                        Follow
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center text-xs text-gray-500">
                                {post.category && <span className="text-blou-600 font-bold mr-2 uppercase text-[10px]">{post.category}</span>}
                                <MapPin size={10} className="mr-1" />
                                <span className="mr-2">{post.village}</span>
                                <span>• {Math.floor((Date.now() - post.timestamp) / 60000)}m ago</span>
                                {post.isEdited && <span className="ml-1 italic text-[10px]">(edited)</span>}
                            </div>
                        </div>
                    </div>
                    
                    {/* More Options Menu Button */}
                    {isMe && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowMenuPostId(showMenuPostId === post.id ? null : post.id)} 
                                className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                            >
                                <MoreVertical size={16} />
                            </button>
                            
                            {/* Dropdown Menu */}
                            {showMenuPostId === post.id && (
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 shadow-xl rounded-lg w-32 z-20 animate-fade-in overflow-hidden">
                                    <button 
                                        onClick={() => startEditing(post)}
                                        className="w-full text-left px-4 py-3 text-xs font-semibold flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-white"
                                    >
                                        <Edit2 size={12} className="mr-2" /> Edit
                                    </button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                                    <button 
                                        onClick={() => handleDelete(post.id)}
                                        className="w-full text-left px-4 py-3 text-xs font-semibold flex items-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                    >
                                        <Trash2 size={12} className="mr-2" /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {editingPostId === post.id ? (
                    <div className="mb-3 animate-fade-in">
                        <textarea 
                            className="w-full p-2 border border-blou-300 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blou-500"
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                            <button 
                                onClick={() => setEditingPostId(null)}
                                className="px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={() => saveEdit(post.id)}
                                className="px-3 py-1 text-xs font-semibold text-white bg-blou-600 hover:bg-blou-700 rounded-lg flex items-center"
                            >
                                <Check size={12} className="mr-1" /> Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap text-sm leading-relaxed">
                        {post.content}
                    </p>
                )}
            </div>

            {post.mediaUrl && (
              <div className="mb-2 overflow-hidden shadow-sm">
                {post.mediaType === 'video' ? (
                   <video src={post.mediaUrl} controls className="w-full h-auto max-h-96 bg-black" />
                ) : (
                   <img src={post.mediaUrl} className="w-full h-auto object-cover max-h-96" loading="lazy" />
                )}
              </div>
            )}

            {/* Backdrop for Menu */}
            {showMenuPostId === post.id && (
                <div className="fixed inset-0 z-10" onClick={() => setShowMenuPostId(null)}></div>
            )}

            <div className="px-4 pb-2">
                <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 py-2 border-t border-gray-100 dark:border-gray-700">
                    <button 
                        onClick={() => setReactingPostId(post.id)}
                        className={`flex items-center space-x-2 flex-1 justify-center py-1.5 rounded-lg transition-all active:scale-95 ${
                            myReaction 
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        {myReaction ? (
                            <span className="text-xl animate-bounce-short leading-none">{myReaction.emoji}</span>
                        ) : (
                            <Heart size={20} />
                        )}
                        <span className={`text-xs font-medium ${myReaction ? 'text-blou-600' : ''}`}>{post.likes}</span>
                    </button>
                    <button 
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                        className={`flex items-center space-x-2 flex-1 justify-center py-1.5 rounded-lg transition-colors ${activeCommentPostId === post.id ? 'text-blou-600 bg-blou-50 dark:bg-blou-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                        <MessageSquare size={20} />
                        <span className="text-xs font-medium">{post.comments}</span>
                    </button>
                    <button 
                        onClick={() => repost(post)}
                        className="flex items-center space-x-2 flex-1 justify-center hover:bg-gray-50 dark:hover:bg-gray-700 py-1.5 rounded-lg transition-colors"
                    >
                        <Repeat size={20} />
                    </button>
                </div>
            </div>

            {/* Facebook Style Comment Section */}
            {activeCommentPostId === post.id && (
                <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 animate-fade-in">
                    
                    {/* List comments */}
                    <div className="space-y-3 mb-4">
                        {post.commentsList && post.commentsList.length > 0 ? (
                            post.commentsList.map(c => (
                                <div key={c.id} className="flex space-x-2 items-start">
                                    <img 
                                        src={c.userAvatar} 
                                        className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600 cursor-pointer" 
                                        onClick={() => viewProfile(c.userId)}
                                    />
                                    <div className="flex flex-col">
                                        <div className="bg-gray-200 dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-tl-none">
                                            <span 
                                                className="font-bold text-xs dark:text-white block mb-0.5 cursor-pointer hover:underline"
                                                onClick={() => viewProfile(c.userId)}
                                            >
                                                {c.userName}
                                            </span>
                                            <span className="text-sm text-gray-800 dark:text-gray-200">{c.content}</span>
                                        </div>
                                        <div className="flex items-center space-x-3 mt-1 ml-2">
                                            <span className="text-[10px] text-gray-500 font-semibold cursor-pointer hover:underline">Like</span>
                                            <span className="text-[10px] text-gray-500 font-semibold cursor-pointer hover:underline">Reply</span>
                                            <span className="text-[10px] text-gray-400">Just now</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500 font-medium">No comments yet.</p>
                                <p className="text-xs text-gray-400">Be the first to share your thoughts!</p>
                            </div>
                        )}
                    </div>

                    {/* Add comment Input Box */}
                    <div className="flex flex-col">
                         <div className="flex items-end space-x-2 relative">
                            <img src={user?.avatar} className="w-8 h-8 rounded-full mb-1 border border-gray-200 dark:border-gray-600" />
                            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center pr-2">
                                <textarea 
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    className="flex-1 text-sm px-3 py-2 bg-transparent dark:text-white focus:outline-none resize-none h-10 pt-2.5 no-scrollbar"
                                    placeholder="Write a comment..."
                                    onKeyDown={(e) => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleCommentSubmit(post.id);
                                        }
                                    }}
                                    onClick={() => setShowEmojiPicker(false)}
                                />
                                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 text-gray-400 hover:text-yellow-500">
                                    <Smile size={16} />
                                </button>
                                <button 
                                    onClick={() => handleCommentSubmit(post.id)} 
                                    className={`p-1.5 rounded-full transition-colors ${commentText.trim() ? 'text-blou-600 hover:bg-blou-50' : 'text-gray-300'}`}
                                    disabled={!commentText.trim()}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                        {showEmojiPicker && (
                            <div className="mt-2 h-64 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                <EmojiPicker onEmojiClick={(emoji) => setCommentText(prev => prev + emoji)} />
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        )})}
        
        {filteredPosts.length === 0 && (
             <div className="text-center py-20 text-gray-400 flex flex-col items-center">
                 <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                     <MessageSquare className="text-gray-300" size={32} />
                 </div>
                 <p className="font-semibold">{isProfileView ? 'No posts yet' : 'No posts yet'}</p>
                 <p className="text-xs mt-1">
                     {isProfileView 
                       ? "This user hasn't posted anything." 
                       : `Be the first to post in ${filterVillage || 'Community'}!`
                     }
                 </p>
             </div>
        )}

        {/* End of Feed */}
        {filteredPosts.length > 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
            End of updates
            </div>
        )}
      </div>
    </div>
  );
};
