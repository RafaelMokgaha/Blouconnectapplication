
import React, { useState, useEffect } from 'react';
import { VILLAGES } from '../constants';
import { useApp } from '../contexts/AppContext';
import { Camera, ChevronRight, Loader2, ChevronUp, User, Mail, Lock, AlertCircle, MapPin } from 'lucide-react';
import { auth, db } from '../firebaseConfig';
import { uploadFile } from '../utils/storage';

export const AuthScreen = () => {
  const { login } = useApp();
  const [step, setStep] = useState<1 | 2>(1); // 1: Auth, 2: Profile (Legacy/Fallback)
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  
  // Auth Form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile Form (Now integrated into Step 1 for Sign Up)
  const [fullName, setFullName] = useState('');
  const [village, setVillage] = useState(VILLAGES[0]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('https://picsum.photos/200/200');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Welcome Screen State
  const [showWelcome, setShowWelcome] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (u) => {
        if (u) {
             setLoading(true);
             try {
                // Check if user is already registered in Firestore
                const userDocRef = db.collection("users").doc(u.uid);
                const userDoc = await userDocRef.get();

                if (userDoc.exists) {
                    // AppContext handles the login state transition via its own listener
                } else {
                    // User exists in Auth but no Profile in Firestore.
                    if (!fullName) { 
                        setShowWelcome(false);
                        setStep(2);
                    }
                    setLoading(false);
                }
             } catch (err: any) {
                 // Suppress permission errors
                 if (err.code !== 'permission-denied') {
                     console.error("Error checking user existence:", err);
                 }
                 setLoading(false);
             }
        }
    });

    return () => unsubscribe();
  }, [fullName]);

  const handleAuth = async () => {
    if (!email || !password) {
        setErrorMsg("Please enter email and password.");
        return;
    }

    if (isSignUp && (!fullName.trim() || !village)) {
        setErrorMsg("Please enter your Name and Village.");
        return;
    }
    
    setErrorMsg('');
    setLoading(true);

    try {
        if (isSignUp) {
            // Create User
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const uid = userCredential.user?.uid;
            
            if (uid) {
                // Create Profile Immediately
                const newUser = {
                    id: uid,
                    fullName: fullName,
                    email: email,
                    phoneNumber: '',
                    village: village,
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`, // Default avatar
                    dob: '',
                    isOnline: true,
                    followers: 0,
                    following: 0,
                    about: 'Community Member',
                    totalLikes: 0,
                    isVerified: false
                };
                
                await login(newUser); // This saves to Firestore and updates Context
            }
        } else {
            // Login
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        
        // Robust Fallback: If Firebase is misconfigured or provider disabled, allow guest access.
        // NOTE: We do NOT include 'auth/invalid-credential' here because that usually means a wrong password/email
        // combination when Email Enumeration Protection is enabled. We don't want to log users in as guests for typos.
        if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/internal-error') {
             console.warn("Auth provider disabled/error. Falling back to simulated login.");
             setIsSimulated(true);
             
             // Create Mock ID based on email
             const mockId = 'guest_' + email.replace(/[^a-zA-Z0-9]/g, '');
             
             const mockUser = {
                id: mockId,
                fullName: isSignUp ? fullName : email.split('@')[0],
                email: email,
                village: isSignUp ? village : VILLAGES[0],
                avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${mockId}`,
                dob: '',
                isOnline: true,
                followers: 0,
                following: 0,
                about: 'Community Member (Guest)',
                totalLikes: 0,
                isVerified: false
             };

             // Small delay to simulate network
             setTimeout(async () => {
                 await login(mockUser);
                 setLoading(false);
             }, 500);
             return;
        }

        let msg = err.message;
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') msg = "Invalid email or account does not exist.";
        if (err.code === 'auth/wrong-password') msg = "Incorrect password.";
        if (err.code === 'auth/email-already-in-use') msg = "Email already in use.";
        if (err.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
        
        // Explicitly handle invalid-credential (often returned by Identity Platform for wrong password)
        if (err.code === 'auth/invalid-credential') msg = "Invalid email or password.";

        setErrorMsg(msg);
        setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    // Create a random guest user
    const randomId = 'guest_' + Math.random().toString(36).substr(2, 9);
    const mockUser = {
        id: randomId,
        fullName: 'Guest User',
        email: 'guest@blouconnect.com',
        phoneNumber: '',
        village: VILLAGES[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomId}`,
        dob: '2000-01-01',
        isOnline: true,
        followers: 0,
        following: 0,
        about: 'Just visiting the community!',
        totalLikes: 0,
        isVerified: false
    };

    // Simulate network delay
    setTimeout(async () => {
        await login(mockUser);
        setLoading(false);
    }, 1500);
  };

  // Legacy Step 2 handler (only used if someone logs in but has no profile)
  const handleFinishLegacyProfile = async () => {
    if ((!auth.currentUser && !isSimulated) || !fullName) {
        setErrorMsg("Please fill in Name.");
        return;
    }
    
    setLoading(true);
    let finalAvatarUrl = avatarPreview;

    try {
        if (avatarFile) {
            if (auth.currentUser && !isSimulated) {
                finalAvatarUrl = await uploadFile(avatarFile, auth.currentUser.uid, 'Profile Picture');
            } else {
                finalAvatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName.replace(/\s/g, '')}`;
            }
        }

        const uid = auth.currentUser ? auth.currentUser.uid : 'guest_' + email.replace(/[^a-zA-Z0-9]/g, '');

        await login({
            id: uid,
            fullName,
            email: auth.currentUser?.email || email,
            phoneNumber: '',
            village,
            dob: '',
            avatar: finalAvatarUrl,
            isOnline: true,
            followers: 0,
            following: 0
        });
    } catch (error) {
        console.error("Registration error:", error);
        setErrorMsg("Failed to complete setup. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientY);
  };
  const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      // If swipe up is significant (> 50px)
      if (distance > 50) {
          setShowWelcome(false);
      }
      setTouchStart(0);
      setTouchEnd(0);
  };

  return (
    <div className="w-full h-[100dvh] md:max-w-md md:h-[95vh] md:mx-auto md:my-4 md:rounded-[2.5rem] md:shadow-2xl md:border-[8px] md:border-gray-900 overflow-hidden relative bg-blou-600 dark:bg-gray-900 transition-all">
      {/* Desktop Notch Simulator */}
      <div className="hidden md:block absolute top-0 left-0 right-0 h-7 bg-gray-900 z-[60] rounded-t-[2rem]">
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black rounded-b-xl"></div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blou-500 rounded-full opacity-30 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blou-400 rounded-full opacity-30 blur-3xl pointer-events-none"></div>

      {/* Welcome Screen Overlay */}
      <div 
        className={`absolute inset-0 z-50 bg-blou-600 flex flex-col items-center justify-center transition-transform duration-700 ease-in-out ${showWelcome ? 'translate-y-0' : '-translate-y-full'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
         <div className="text-center text-white px-8 animate-fade-in flex flex-col items-center">
             <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl mb-8 p-4">
                <img src="https://static.wixstatic.com/media/a827d0_d405a6c5e1dc4ce3b4b7c86430986c12~mv2.png" className="w-full h-full object-contain" alt="Logo" />
             </div>
             <h1 className="text-4xl font-bold mb-4 tracking-tight">BlouConnect</h1>
             <p className="text-blou-100 text-lg mb-12 max-w-xs leading-relaxed">Connecting villages, building community.</p>
             
             <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center animate-bounce-short cursor-pointer" onClick={() => setShowWelcome(false)}>
                 <p className="text-xs uppercase tracking-widest mb-3 opacity-80 font-semibold">Swipe Up to Join</p>
                 <ChevronUp size={36} className="opacity-80" />
             </div>

             {/* Hidden on mobile, visible on desktop for accessibility */}
             <button 
                onClick={() => setShowWelcome(false)}
                className="hidden md:block mt-8 bg-white text-blou-600 px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blou-50 transition-colors"
             >
                 Get Started
             </button>
         </div>
      </div>

      {/* Auth Form */}
      <div className={`h-full w-full flex flex-col items-center justify-center px-6 transition-all duration-700 delay-300 ${showWelcome ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
        <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 z-10 max-w-md">
            <div className="flex justify-center mb-6">
                <img src="https://static.wixstatic.com/media/a827d0_d405a6c5e1dc4ce3b4b7c86430986c12~mv2.png" className="w-16 h-16 object-contain" alt="Logo" />
            </div>

            <h1 className="text-2xl font-bold text-center mb-2 dark:text-white">
            {step === 1 ? (isSignUp ? 'Create Account' : 'Welcome Back') : 'Complete Profile'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
            {step === 1 
                ? (isSignUp ? 'Sign up to connect with your community' : 'Login to continue to BlouConnect') 
                : 'Just a few more details'
            }
            </p>

            {errorMsg && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs p-3 rounded-lg mb-4 flex items-center justify-center text-center">
                    <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {step === 1 && (
            <div className="space-y-4">
                
                {/* Sign Up Fields: Name & Village */}
                {isSignUp && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blou-500 dark:text-white text-sm"
                                placeholder="Full Name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <select 
                                value={village} 
                                onChange={(e) => setVillage(e.target.value)}
                                className="w-full pl-10 pr-8 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blou-500 dark:text-white text-sm appearance-none"
                            >
                                {VILLAGES.map(v => (
                                <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                            <ChevronRight className="absolute right-3 top-3.5 text-gray-400 rotate-90" size={14} />
                        </div>
                    </div>
                )}

                {/* Common Fields */}
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="email" 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blou-500 dark:text-white text-sm"
                        placeholder="Email Address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <input 
                        type="password" 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blou-500 dark:text-white text-sm"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                    />
                </div>
                
                <button 
                    onClick={handleAuth}
                    disabled={loading}
                    className="w-full bg-blou-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blou-600/30 disabled:opacity-50 flex items-center justify-center"
                >
                    {loading ? <Loader2 className="animate-spin" /> : (isSignUp ? 'Sign Up & Join' : 'Login')}
                </button>

                <div className="text-center text-sm text-gray-500 mt-2">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button 
                        onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
                        className="text-blou-600 font-bold hover:underline"
                    >
                        {isSignUp ? 'Login' : 'Sign Up'}
                    </button>
                </div>

                {!isSignUp && (
                    <>
                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OR</span>
                            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                        </div>

                        <button 
                            onClick={handleDemoLogin}
                            disabled={loading}
                            className="w-full bg-white dark:bg-gray-700 text-blou-600 dark:text-white border border-blou-200 dark:border-gray-600 py-3 rounded-xl font-semibold shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm"
                        >
                            <User size={16} className="mr-2" />
                            Enter as Guest (Demo)
                        </button>
                    </>
                )}
            </div>
            )}

            {step === 2 && (
            <div className="space-y-4 overflow-y-auto max-h-[50vh] no-scrollbar">
                <div className="flex justify-center">
                <div className="relative">
                    <img src={avatarPreview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blou-100 dark:border-gray-600" />
                    <label className="absolute bottom-0 right-0 bg-blou-600 p-2 rounded-full cursor-pointer text-white shadow-md hover:bg-blou-700 transition-colors">
                    <Camera size={16} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                </div>
                </div>

                <input 
                type="text" 
                placeholder="Full Name"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 dark:text-white"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                />

                <div>
                <label className="text-xs text-gray-500 ml-1">Village / Area</label>
                <select 
                    value={village} 
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 dark:text-white"
                >
                    {VILLAGES.map(v => (
                    <option key={v} value={v}>{v}</option>
                    ))}
                </select>
                </div>

                <button 
                onClick={handleFinishLegacyProfile}
                className="w-full bg-blou-600 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blou-600/30 hover:bg-blou-700 transition-colors"
                >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : "Complete Setup"}
                </button>
            </div>
            )}
        </div>
        
        <div className="absolute bottom-6 text-white/50 text-xs">BlouConnect v1.0 • Powered by RAFAPROJECT</div>
      </div>
    </div>
  );
};
