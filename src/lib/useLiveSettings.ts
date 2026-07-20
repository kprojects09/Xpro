import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useLiveSettings() {
  const [appSettings, setAppSettings] = useState({
    appName: 'Sweety Study Partner',
    shortName: 'Sweety AI',
    primaryColor: '#ec4899',
    themeType: 'dark',
    welcomeMessage: 'Welcome to your premium study mentor',
    version: '3.9',
    footerText: 'Powered by Antigravity',
    contactEmail: 'support@neostudy.ai',
    appLogoUrl: '',
    splashLogoUrl: '',
    splashBackgroundUrl: '',
    appDescription: 'Your intelligent companion for academic success and daily routines.',
    aiAssistantName: 'Sweety',
    aiAssistantAvatarUrl: 'https://i.ibb.co/fzg90pKT/wink.jpg',
    membershipBannerUrl: '',
    homeBannerUrl: '',
    aboutPageContent: 'This application was developed by Krish and his team with the goal of providing users with a modern AI-powered platform featuring an AI Assistant, Voice Assistant, Messaging, and other smart features. The team is committed to continuously improving the application with new updates, better performance, and enhanced security.',
    socialLinks: '',
    privacyPolicy: '',
    termsAndConditions: '',
    notesBannerUrl: '',
    announcementBannerUrl: ''
  });

  useEffect(() => {
    const unsubApp = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAppSettings(prev => ({ ...prev, ...data }));
        if (data.appName) {
          document.title = data.appName;
        }
        if (data.appLogoUrl) {
          const icon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
          if (icon) icon.href = data.appLogoUrl;
          const appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
          if (appleIcon) appleIcon.href = data.appLogoUrl;
        }
      }
    }, (err) => { console.warn('App settings sync delayed:', err); });
    
    // Also listen to about for backwards compatibility if needed, but prefer app
    const unsubAbout = onSnapshot(doc(db, 'settings', 'about'), (docSnap) => {
      if (docSnap.exists()) {
        setAppSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
    }, (err) => { console.warn('About settings sync delayed:', err); });

    return () => {
      unsubApp();
      unsubAbout();
    };
  }, []);

  return { appSettings, aboutSettings: appSettings };
}

