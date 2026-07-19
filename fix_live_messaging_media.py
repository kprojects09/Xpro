import re

with open('src/components/LiveMessaging.tsx', 'r') as f:
    content = f.read()

old_handle = """  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;"""

new_handle = """  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const p = await permissionManager.requestPermission('media', 'Photos and Media Access', 'Sweety needs access to your media so you can send attachments in chat.');
    if (!p) {
      e.target.value = '';
      return;
    }"""

content = content.replace(old_handle, new_handle)

with open('src/components/LiveMessaging.tsx', 'w') as f:
    f.write(content)
