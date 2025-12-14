
import React, { ReactNode } from 'react';
import { Home, Compass, MessageCircle, User as UserIcon, PlusCircle } from 'lucide-react';
import { AppTab } from '../types';
import { useApp } from '../contexts/AppContext';

interface LayoutProps {
  children: ReactNode;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onPostClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, onPostClick }) => {
  const { totalUnreadCount } = useApp();
  
  const NavItem = ({ tab, icon: Icon, label, badgeCount }: { tab: AppTab; icon: any; label: string; badgeCount?: number }) => {
    const isActive = activeTab === tab;
    return (
      <button 
        onClick={() => onTabChange(tab)}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive ? 'text-blou-600 dark:text-blou-400' : 'text-gray-500 dark:text-gray-400'}`}
      >
        <div className="relative">
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            {badgeCount && badgeCount > 0 ? (
                <div className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 border-2 border-white dark:border-gray-800">
                    {badgeCount > 9 ? '9+' : badgeCount}
                </div>
            ) : null}
        </div>
        <span className="text-[10px] font-medium">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col w-full h-[100dvh] md:max-w-md md:h-[95vh] md:mx-auto md:my-4 md:rounded-[2.5rem] md:shadow-2xl md:border-[8px] md:border-gray-900 bg-white dark:bg-gray-900 overflow-hidden relative transition-all">
      {/* Status Bar Spacer for Desktop "Device" look */}
      <div className="hidden md:block absolute top-0 left-0 right-0 h-7 bg-gray-900 z-[60] rounded-t-[2rem]">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black rounded-b-xl"></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-20 bg-gray-50 dark:bg-gray-900 relative md:pt-8">
        {children}
      </main>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between px-2 z-50 md:rounded-b-[2rem]">
        <NavItem tab="home" icon={Home} label="Community" />
        <NavItem tab="discovery" icon={Compass} label="Discovery" />
        
        {/* FAB Style Post Button in Center */}
        <div className="relative -top-5">
           <button 
            onClick={onPostClick}
            className="w-14 h-14 rounded-full bg-blou-600 text-white shadow-lg flex items-center justify-center hover:bg-blou-700 hover:scale-105 transition-all"
           >
             <PlusCircle size={28} />
           </button>
        </div>

        <NavItem tab="chat" icon={MessageCircle} label="Chats" badgeCount={totalUnreadCount} />
        <NavItem tab="profile" icon={UserIcon} label="Profile" />
      </div>
    </div>
  );
};
