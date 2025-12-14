import React, { useState } from 'react';
import { EMOJI_CATEGORIES, EMOJI_LIST } from '../constants/emojis';
import { Search } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiClick: (emoji: string) => void;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiClick }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [search, setSearch] = useState('');

  const filteredEmojis = search
    ? Object.values(EMOJI_LIST).flat().filter(e => true) 
    : EMOJI_LIST[activeCategory];

  return (
    <div className="flex flex-col w-full h-full bg-gray-100 dark:bg-gray-800">
      {/* Category Tabs */}
      <div className="flex overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
            className={`flex-none p-3 text-xl opacity-70 hover:opacity-100 transition-opacity ${activeCategory === cat.id ? 'border-b-2 border-blou-600 opacity-100 bg-gray-50 dark:bg-gray-800' : ''}`}
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Emoji Grid - Uses 6 cols to fit small screens safely */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-6 gap-1">
           {filteredEmojis.map((emoji, index) => (
             <button
               key={index}
               onClick={() => onEmojiClick(emoji)}
               className="text-2xl hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1 transition-transform active:scale-90 flex items-center justify-center h-10 w-full"
             >
               {emoji}
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};