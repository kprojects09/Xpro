import re

with open('src/components/OnboardingForm.tsx', 'r') as f:
    content = f.read()

content = content.replace('hasOnboarded: true,', 'hasOnboarded: true,\n                  skipped: true,')

with open('src/components/OnboardingForm.tsx', 'w') as f:
    f.write(content)

with open('src/App.tsx', 'r') as f:
    content2 = f.read()

old_oncomplete = """          onComplete={async (onboardingData) => {
            if (!currentUser) return;
            try {
              addSystemLog(`[CLOUD] Registering academic profile...`);
              const userDocRef = doc(db, 'users', currentUser.uid);
              const payload = {
                ...onboardingData,
                hasOnboarded: false, // keep false until welcome screen continue is clicked
                role: currentUserRole || 'user'
              };
              await syncUserProfile(currentUser.uid, payload);
              setUserProfile(payload);
              setOnboardingStage('welcome');
            } catch (err: any) {
              console.error('Error saving onboarding data:', err);
              addSystemLog(`[CLOUD_ERROR] Onboarding failed: ${err.message}`);
              setOnboardingStage('welcome');
            }
          }}"""

new_oncomplete = """          onComplete={async (onboardingData: any) => {
            if (!currentUser) return;
            try {
              addSystemLog(`[CLOUD] Registering academic profile...`);
              if (onboardingData.skipped) {
                 delete onboardingData.skipped;
                 const payload = { ...onboardingData, hasOnboarded: true, role: currentUserRole || 'user' };
                 await syncUserProfile(currentUser.uid, payload);
                 setUserProfile(payload);
                 setHasOnboarded(true);
                 setOnboardingStage('done');
                 setActiveTab('home');
              } else {
                 const payload = {
                   ...onboardingData,
                   hasOnboarded: false, // keep false until welcome screen continue is clicked
                   role: currentUserRole || 'user'
                 };
                 await syncUserProfile(currentUser.uid, payload);
                 setUserProfile(payload);
                 setOnboardingStage('welcome');
              }
            } catch (err: any) {
              console.error('Error saving onboarding data:', err);
              addSystemLog(`[CLOUD_ERROR] Onboarding failed: ${err.message}`);
              setOnboardingStage('welcome');
            }
          }}"""

content2 = content2.replace(old_oncomplete, new_oncomplete)

with open('src/App.tsx', 'w') as f:
    f.write(content2)
