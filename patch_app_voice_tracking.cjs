const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Add imports
code = code.replace(
  "import { Settings as UserProfileSettings } from './components/Settings';",
  "import { Settings as UserProfileSettings } from './components/Settings';\nimport { PremiumUpgradeModal } from './components/PremiumUpgradeModal';"
);

// Add states
code = code.replace(
  "const [activeTab, setActiveTab] = useState",
  `const [freeVoiceTimeLimit, setFreeVoiceTimeLimit] = useState(7200);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumModalMessage, setPremiumModalMessage] = useState('');
  const [voiceTimeUsedToday, setVoiceTimeUsedToday] = useState(0);
  const activeTabRef = useRef(activeTab);
  
  const [activeTab, setActiveTab] = useState`
);

// Update activeTabRef when activeTab changes
code = code.replace(
  "useEffect(() => {\n    const local = localStorage.getItem('sweety_chat_history');",
  "useEffect(() => {\n    activeTabRef.current = activeTab;\n  }, [activeTab]);\n\n  useEffect(() => {\n    const local = localStorage.getItem('sweety_chat_history');"
);

// Global settings and voice tracking interval
const trackIntervalCode = `
  useEffect(() => {
    // Fetch global settings for free voice time limit
    const unsub = onSnapshot(doc(db, 'admin_settings', 'global'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().freeVoiceTimeLimit) {
        setFreeVoiceTimeLimit(docSnap.data().freeVoiceTimeLimit);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    // Sync local state with DB state on load
    const todayStr = getTodayStr();
    if (userProfile.voiceUsage?.date === todayStr) {
      setVoiceTimeUsedToday(userProfile.voiceUsage.timeUsed || 0);
    } else {
      setVoiceTimeUsedToday(0);
    }
  }, [currentUser, userProfile?.voiceUsage?.date]);

  useEffect(() => {
    if (!currentUser) return;
    
    let intervalId: any;
    
    // Start tracking if in voice tab
    intervalId = setInterval(() => {
      if (activeTabRef.current === 'voice') {
        const todayStr = getTodayStr();
        const isPremium = userProfile?.isPremium === true;
        
        setVoiceTimeUsedToday(prev => {
          const newTime = prev + 1;
          
          if (!isPremium && newTime >= freeVoiceTimeLimit) {
            // Kick out
            setActiveTab('home');
            setPremiumModalMessage("You've used today's free Voice Assistant limit. Upgrade to Premium for unlimited AI Voice conversations.");
            setShowPremiumModal(true);
            return freeVoiceTimeLimit;
          }
          
          return newTime;
        });
      }
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [currentUser, userProfile?.isPremium, freeVoiceTimeLimit]);

  // Periodically save to DB every 10 seconds if in voice tab
  useEffect(() => {
    if (!currentUser || activeTab !== 'voice') return;
    
    const saveInterval = setInterval(async () => {
      const todayStr = getTodayStr();
      try {
         await updateDoc(doc(db, 'users', currentUser.uid), {
           'voiceUsage.date': todayStr,
           'voiceUsage.timeUsed': voiceTimeUsedToday
         });
      } catch (e) { console.error(e); }
    }, 10000);
    
    return () => {
      clearInterval(saveInterval);
      // Save on unmount
      const todayStr = getTodayStr();
      if (currentUser && voiceTimeUsedToday > 0) {
        updateDoc(doc(db, 'users', currentUser.uid), {
           'voiceUsage.date': todayStr,
           'voiceUsage.timeUsed': voiceTimeUsedToday
         }).catch(e => console.error(e));
      }
    };
  }, [currentUser, activeTab, voiceTimeUsedToday]);
`;

code = code.replace(
  "useEffect(() => {\n    if (!currentUser) {",
  trackIntervalCode + "\n\n  useEffect(() => {\n    if (!currentUser) {"
);

// Add the modal at the end before </div>
const modalCode = `
      <AnimatePresence>
        {showPremiumModal && (
          <PremiumUpgradeModal 
            onClose={() => setShowPremiumModal(false)}
            onUpgrade={async (plan) => {
              if (currentUser) {
                // Simulate purchase
                await updateDoc(doc(db, 'users', currentUser.uid), {
                  isPremium: true,
                  premiumPlan: plan
                });
                alert('Successfully upgraded to Premium via Google Play Billing!');
                setShowPremiumModal(false);
              }
            }}
            message={premiumModalMessage}
          />
        )}
      </AnimatePresence>
`;
code = code.replace(
  "{/* Floating Theme Selection Modal */}",
  modalCode + "\n      {/* Floating Theme Selection Modal */}"
);

fs.writeFileSync('src/App.tsx', code);
