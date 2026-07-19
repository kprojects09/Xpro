const fs = require('fs');
let code = fs.readFileSync('src/components/AIChatRoom.tsx', 'utf-8');

// Replace handleSimulatedUpload
code = code.replace(
  "const handleSimulatedUpload = (type: 'pdf' | 'image') => {",
  `
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment(file);
    addSystemLog(\`[UPLOAD] \${file.name} attached.\`);
  };

  const handleSimulatedUpload = (type: 'pdf' | 'image') => {`
);

// Add the hidden input and change the button onClick
const buttonRegex = /<button[^>]*onClick=\{\(\) => handleSimulatedUpload\('pdf'\)\}[^>]*>[\s\S]*?<\/button>/;
code = code.replace(buttonRegex, (match) => {
  return `<input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.ppt,.pptx,.png,.jpg,.webp,.mp4,.mp3,.zip" onChange={handleFileUpload} />
  <button
    onClick={() => fileInputRef.current?.click()}
    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-indigo-400 transition-colors border border-white/5 hover:border-indigo-500/30 text-left group"
  >
    <div className="p-2 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20"><FileText size={20} /></div>
    <div className="flex-1">
      <div className="text-sm font-bold text-white">Upload File</div>
      <div className="text-xs text-gray-400">PDF, DOCX, Images, MP3, MP4</div>
    </div>
  </button>`;
});

fs.writeFileSync('src/components/AIChatRoom.tsx', code);
