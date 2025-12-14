
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { AuthScreen } from './pages/Auth';
import { Layout } from './components/Layout';
import { Feed } from './pages/Feed';
import { Discovery } from './pages/Discovery';
import { ChatSection } from './pages/Chat';
import { Profile } from './pages/Profile';
import { PostModal } from './components/PostModal';
import { AppTab } from './types';

// Splash Screen Component
const Splash = () => (
  <div className="h-screen w-full flex items-center justify-center bg-blou-600 text-white">
    <div className="text-center animate-fade-in">
      <div className="w-24 h-24 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl p-2">
        <img src="https://static.wixstatic.com/media/a827d0_d405a6c5e1dc4ce3b4b7c86430986c12~mv2.png" className="w-full h-full object-contain" alt="BlouConnect Logo" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight">BlouConnect</h1>
      <p className="mt-2 text-blou-200 text-sm">Community. Connected.</p>
    </div>
  </div>
);

const MainApp = () => {
  const { user, loading, viewingProfileId, viewProfile, activeTab, setActiveTab } = useApp();
  const [showPostModal, setShowPostModal] = useState(false);

  // Splash Screen Logic
  if (loading) return <Splash />;

  // Auth Logic
  if (!user) return <AuthScreen />;

  // View Profile Logic (Overlay)
  if (viewingProfileId) {
      return (
        <Profile 
          targetUserId={viewingProfileId} 
          onBack={() => viewProfile(null)} 
        />
      );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <Feed />;
      case 'discovery': return <Discovery />;
      case 'chat': return <ChatSection />;
      case 'profile': return <Profile targetUserId={user.id} />;
      default: return <Feed />;
    }
  };

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onPostClick={() => setShowPostModal(true)}
      >
        {renderContent()}
      </Layout>
      {showPostModal && <PostModal onClose={() => setShowPostModal(false)} />}
    </>
  );
};

const App = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;
