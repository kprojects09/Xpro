import re

with open('src/components/OnboardingForm.tsx', 'r') as f:
    content = f.read()

skip_btn = """        <div className="w-full max-w-2xl text-center space-y-4 mb-8 z-10 relative mt-8">
          <div className="flex justify-between items-start w-full px-4 mb-4 absolute top-0 left-0 right-0">
             <div className="opacity-0 w-24"></div>
             <button onClick={() => {
                const p = {
                  fullName: "Scholar",
                  username: "user_" + Math.floor(Math.random() * 1000000),
                  hasOnboarded: true,
                  avatarIndex: 0
                };
                onComplete(p);
             }} className="text-sm font-bold text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                Skip for now
             </button>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/35 rounded-full text-xs font-semibold text-purple-300">"""

content = content.replace('        <div className="w-full max-w-2xl text-center space-y-4 mb-8 z-10 relative mt-8">\n          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/35 rounded-full text-xs font-semibold text-purple-300">', skip_btn)

with open('src/components/OnboardingForm.tsx', 'w') as f:
    f.write(content)
