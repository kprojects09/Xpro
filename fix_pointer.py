import re

with open('src/components/FriendsPage.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[40px] -mr-10 -mt-10"',
    'className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-[40px] -mr-10 -mt-10 pointer-events-none"'
)

content = content.replace(
    'className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-[40px] -mr-10 -mt-10"',
    'className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 blur-[40px] -mr-10 -mt-10 pointer-events-none"'
)

with open('src/components/FriendsPage.tsx', 'w') as f:
    f.write(content)
