import re

with open('src/components/Settings.tsx', 'r') as f:
    content = f.read()

old_handle = """  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];"""

new_handle = """  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const p = await permissionManager.requestPermission('media', 'Photos and Media Access', 'Sweety needs access to your photos to upload a profile picture.');
      if (!p) {
        e.target.value = '';
        return;
      }
      const file = e.target.files[0];"""

content = content.replace(old_handle, new_handle)

with open('src/components/Settings.tsx', 'w') as f:
    f.write(content)
