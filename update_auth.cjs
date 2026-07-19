const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add sendEmailVerification to imports
code = code.replace(
  'import { signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from \'firebase/auth\';',
  'import { signInWithCredential, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from \'firebase/auth\';'
);

// 2. Add EmailVerificationScreen component before App component
const verificationScreenCode = `
function EmailVerificationScreen({ currentUser, onLogout, theme }: any) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  
  const handleResend = async () => {
    setSending(true);
    setMsg('');
    try {
      await sendEmailVerification(currentUser);
      setMsg('Verification email sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setMsg(err.message || 'Failed to send email.');
    }
    setSending(false);
  };

  const handleRefresh = async () => {
    await currentUser.reload();
    if (currentUser.emailVerified) {
      window.location.reload();
    } else {
      setMsg('Email is still not verified. Please check your inbox.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-950 font-sans p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-black z-0" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-[100px] animate-pulse pointer-events-none" />
      
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-pink-500">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Verify your Email</h2>
        <p className="text-gray-400 mb-6 text-sm">
          A verification link has been sent to <strong className="text-white">{currentUser?.email}</strong>. 
          Please verify your email address to access the app.
        </p>

        {msg && (
          <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-xl text-sm text-pink-400">
            {msg}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleRefresh}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-semibold hover:brightness-110 active:scale-95 transition-all"
          >
            I have verified, continue
          </button>
          
          <button 
            onClick={handleResend}
            disabled={sending}
            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white font-semibold hover:bg-white/10 active:scale-95 transition-all"
          >
            {sending ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button 
            onClick={onLogout}
            className="w-full py-3 mt-4 text-gray-500 font-semibold hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
`;

code = code.replace(
  'export default function App() {',
  verificationScreenCode + '\nexport default function App() {'
);

// 3. Update AuthHub isSignUp logic
const oldSignup = `      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMsg("Account created successfully!");
        addSystemLog(\`[AUTH] New account created for \${email}\`);
      }`;

const newSignup = `      if (isSignUp) {
        const blockedDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'throwawaymail.com', 'mailinator.com', 'temp-mail.org'];
        const domain = email.split('@')[1]?.toLowerCase();
        if (blockedDomains.includes(domain)) {
           throw new Error("Please use a real, permanent email address.");
        }
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        setSuccessMsg("Account created! A verification email has been sent. Please verify before logging in.");
        addSystemLog(\`[AUTH] New account created for \${email}, verification email sent\`);
      }`;

code = code.replace(oldSignup, newSignup);

// 4. In AuthHub, prevent setTimeout onUnlock if they signed up (they need to verify)
const oldUnlock = `      setTimeout(() => {
        onUnlock(false, userCredential.user);
      }, 1000);`;

const newUnlock = `      if (!isSignUp || userCredential.user.emailVerified) {
        setTimeout(() => {
          onUnlock(false, userCredential.user);
        }, 1000);
      }`;

code = code.replace(oldUnlock, newUnlock);

// 5. In App component, render EmailVerificationScreen
const oldAuthHubRender = `  if (!isAppUnlocked) {
    return (
      <AuthHub `;

const newAuthHubRender = `  if (currentUser && !currentUser.emailVerified) {
    return <EmailVerificationScreen currentUser={currentUser} onLogout={() => auth.signOut()} theme={theme} />;
  }

  if (!isAppUnlocked) {
    return (
      <AuthHub `;

code = code.replace(oldAuthHubRender, newAuthHubRender);

fs.writeFileSync('src/App.tsx', code, 'utf-8');
console.log('done');
