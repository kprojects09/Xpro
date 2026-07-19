import re

with open('src/components/StoriesPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { auth, db } from '../firebase';", "import { auth, db } from '../firebase';\nimport { permissionManager } from '../lib/permissionManager';")

old_handle = """  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.currentUser) {
      setIsUploading(true);"""

new_handle = """  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && auth.currentUser) {
      const p = await permissionManager.requestPermission('media', 'Photos and Media Access', 'Sweety needs access to your photos to upload a story.');
      if (!p) {
        e.target.value = '';
        return;
      }
      setIsUploading(true);"""

content = content.replace(old_handle, new_handle)

with open('src/components/StoriesPage.tsx', 'w') as f:
    f.write(content)
