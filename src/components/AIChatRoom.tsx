import { getApiUrl } from "../lib/apiConfig";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Bot, User, Sparkles, Image, FileText, Pin, PhoneCall, 
  Copy, Check, Plus, Search, Star, Trash2, Edit3, Download, FileCode, CheckSquare, Crown, History, X, Menu
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useLiveSettings } from '../lib/useLiveSettings';
import { db } from '../firebase';
import { 
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy 
} from 'firebase/firestore';

interface AIChatRoomProps {
  theme: any;
  chatHistory: any[];
  addSystemLog: (log: string) => void;
  setActiveTab: (tab: any) => void;
  currentUser: any;
  userProfile?: any;
  setShowPremiumModal?: (show: boolean) => void;
  setPremiumModalMessage?: (msg: string) => void;
  onExecuteDeviceAction?: (args: any) => Promise<any>;
}

export function AIChatRoom({ 
  theme, 
  chatHistory, 
  addSystemLog, 
  setActiveTab,
  currentUser,
  userProfile,
  setShowPremiumModal,
  setPremiumModalMessage,
  onExecuteDeviceAction
}: AIChatRoomProps) {
  const { appSettings } = useLiveSettings();
  
  const userName = userProfile?.fullName || userProfile?.displayName || userProfile?.username || currentUser?.displayName || '';
  const greeting = userName ? `Hello, ${userName}!` : 'Hello!';
  const defaultMessageText = appSettings?.welcomeMessage || `${greeting} Ami ${appSettings?.aiAssistantName || 'Sweety'}, apnar personal AI Study Assistant...`;

  // Default first message for fresh sessions
  const defaultMessage = useMemo(() => ({
    id: 'default-welcome',
    role: 'assistant' as const,
    text: defaultMessageText,
    timestamp: new Date()
  }), [defaultMessageText]);

  const [messages, setMessages] = useState<any[]>([defaultMessage]);
  
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === 'default-welcome' && prev[0].text !== defaultMessageText) {
        return [{...prev[0], text: defaultMessageText}];
      }
      return prev;
    });
  }, [defaultMessageText]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: 'pdf' | 'image'; base64Data?: string; mimeType?: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // History State
  const [histories, setHistories] = useState<any[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [showHistoryMenu, setShowHistoryMenu] = useState(false);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Real-time listener for user histories
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      setHistories([]);
      return;
    }
    
    const historiesRef = collection(db, 'users', currentUser.uid, 'histories');
    const q = query(historiesRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setHistories(fetched);
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permissions denied for histories snapshot, possibly during logout or session change.");
      } else {
        console.error("Error reading histories onSnapshot:", error);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTogglePin = (id: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, isPinned: !m.isPinned };
      }
      return m;
    }));
  };

  // Start a completely fresh chat session
  const handleStartNewSession = () => {
    setActiveHistoryId(null);
    setMessages([defaultMessage]);
    setAttachedFile(null);
    setInputText('');
    addSystemLog(`[CHAT] Started a clean, fresh study workspace.`);
  };

  // Continue a saved session
  const handleContinueSession = (history: any) => {
    setActiveHistoryId(history.id);
    if (history.messages && Array.isArray(history.messages)) {
      // Rehydrate timestamps
      const formatted = history.messages.map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));
      setMessages(formatted);
    } else {
      setMessages([defaultMessage]);
    }
    addSystemLog(`[CHAT] Activated workspace session: "${history.title}"`);
  };

  // Save or Update Session in Firestore
  const syncSessionToCloud = async (currentMessages: any[], overrideId?: string, forceTitle?: string) => {
    if (!currentUser) return;

    const sessionId = overrideId || activeHistoryId || `session_${Date.now()}`;
    const historiesRef = collection(db, 'users', currentUser.uid, 'histories');
    const docRef = doc(historiesRef, sessionId);

    // Formulate a beautiful title if it's a new session
    let title = forceTitle;
    if (!title) {
      const existing = histories.find(h => h.id === sessionId);
      if (existing) {
        title = existing.title;
      } else {
        // Find first user text or use fallback
        const firstUserMsg = currentMessages.find(m => m.role === 'user');
        const content = firstUserMsg ? firstUserMsg.text : '';
        title = content 
          ? (content.length > 28 ? content.substring(0, 28) + '...' : content)
          : `Study Session - ${new Date().toLocaleDateString()}`;
      }
    }

    const payload = {
      title,
      createdAt: new Date().toISOString(),
      messages: currentMessages.map(m => ({
        id: m.id,
        role: m.role,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
        attachment: m.attachment || null,
        isPinned: !!m.isPinned
      })),
      favourite: histories.find(h => h.id === sessionId)?.favourite || false
    };

    try {
      await setDoc(docRef, payload, { merge: true });
      if (!activeHistoryId) {
        setActiveHistoryId(sessionId);
      }
    } catch (err: any) {
      console.error("Error syncing session to cloud:", err);
    }
  };

  // Rename Saved Session
  const handleRenameSession = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editTitleInput.trim() || !currentUser) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'histories', id);
      await setDoc(docRef, { title: editTitleInput.trim() }, { merge: true });
      addSystemLog(`[CHAT] Session renamed to: "${editTitleInput.trim()}"`);
      setEditingHistoryId(null);
    } catch (err: any) {
      console.error("Failed to rename session:", err);
    }
  };

  // Delete Saved Session
  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!confirm("Are you sure you want to permanently delete this saved study session?")) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'histories', id);
      await deleteDoc(docRef);
      addSystemLog(`[CHAT] Deleted saved session.`);
      if (activeHistoryId === id) {
        handleStartNewSession();
      }
    } catch (err: any) {
      console.error("Failed to delete session:", err);
    }
  };

  // Star/Favourite Session
  const handleToggleFavourite = async (id: string, currentFav: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return;

    try {
      const docRef = doc(db, 'users', currentUser.uid, 'histories', id);
      await setDoc(docRef, { favourite: !currentFav }, { merge: true });
      addSystemLog(`[CHAT] Star state toggled.`);
    } catch (err: any) {
      console.error("Failed to star session:", err);
    }
  };

  // Export beautiful PDF Transcript layout
  const handleExportPDF = (history: any, e: React.MouseEvent) => {
    e.stopPropagation();
    addSystemLog(`[CHAT] Generating printer-friendly study session PDF...`);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export PDF!");
      return;
    }
    
    const title = history.title || `${appSettings.appName} Study Session`;
    const dateStr = new Date(history.createdAt || Date.now()).toLocaleString();
    
    let messagesHtml = '';
    const sessionMessages = history.messages || [];
    
    sessionMessages.forEach((m: any) => {
      const roleLabel = m.role === 'user' ? 'Student' : appSettings.appName;
      const bgClass = m.role === 'user' ? 'background: #f1f5f9; border-left: 4px solid #4f46e5;' : 'background: #faf5ff; border-left: 4px solid #ec4899;';
      const attachmentHtml = m.attachment 
        ? `<div style="margin-bottom: 8px; padding: 6px; background: rgba(0,0,0,0.05); font-family: monospace; font-size: 11px; border-radius: 4px;">📎 Attached File: ${m.attachment.name}</div>` 
        : '';

      messagesHtml += `
        <div style="margin-bottom: 20px; padding: 15px; border-radius: 12px; ${bgClass}">
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: #475569; margin-bottom: 6px; letter-spacing: 0.5px;">${roleLabel}</strong>
          ${attachmentHtml}
          <div style="font-size: 13.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${m.text}</div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 40px; 
              color: #1e293b; 
              max-width: 800px; 
              margin: 0 auto; 
              background: #fff;
            }
            h1 { 
              font-size: 26px; 
              font-weight: 800; 
              margin-bottom: 5px; 
              color: #0f172a; 
              letter-spacing: -0.5px;
            }
            .meta { 
              font-size: 12px; 
              color: #64748b; 
              margin-bottom: 30px; 
              border-bottom: 1px solid #e2e8f0; 
              padding-bottom: 15px; 
            }
            .footer { 
              font-size: 11px; 
              color: #94a3b8; 
              text-align: center; 
              margin-top: 50px; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 15px; 
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">
            <strong>{appSettings.appName} Premium Co-Pilot</strong> &bull; 
            <strong>Created:</strong> ${dateStr}
          </div>
          <div>
            ${messagesHtml}
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${appSettings.appName} Workspace. Prepared for academic submission.
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Trigger real or simulated Gemini text generation
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    // Check free user daily text limit
    const isPremium = userProfile?.isPremium === true;
    if (!isPremium && currentUser) {
      const todayStr = new Date().toISOString().split('T')[0];
      const textUsage = userProfile?.textUsage;
      const currentCount = (textUsage && textUsage.date === todayStr) ? (textUsage.count || 0) : 0;
      
      if (currentCount >= 399) {
        if (setPremiumModalMessage && setShowPremiumModal) {
          setPremiumModalMessage("You have reached today's free limit of 399 AI text messages. Upgrade to Premium for unlimited access.");
          setShowPremiumModal(true);
        } else {
          alert("You have reached today's free limit of 399 AI text messages. Upgrade to Premium for unlimited access.");
        }
        return;
      }
    }

    const userText = inputText;
    const attachment = attachedFile || undefined;
    setInputText('');
    setAttachedFile(null);

    const userMsg = {
      id: String(Date.now()),
      role: 'user' as const,
      text: userText || `[Sent attachment: ${attachment?.name}]`,
      timestamp: new Date(),
      attachment
    };

    // Calculate next temporary message list to sync instantly
    const messagesWithUser = [...messages, userMsg];
    setMessages(messagesWithUser);
    setIsTyping(true);

    // Save user message immediately to Firestore under a specific session
    const activeId = activeHistoryId || `session_${Date.now()}`;
    await syncSessionToCloud(messagesWithUser, activeId);

    // Intercept routine / alarm commands in typed chat
    if (userText && currentUser) {
      try {
        const { processVoiceOrTextCommand } = await import('../lib/routineCommands');
        const userLang = 'English'; // fallback lang
        const res = await processVoiceOrTextCommand(userText, currentUser.uid, userLang);
        if (res.matched) {
          const assistantMsg = {
            id: String(Date.now() + 1),
            role: 'assistant' as const,
            text: res.replyText,
            timestamp: new Date()
          };
          const finalMessages = [...messagesWithUser, assistantMsg];
          setMessages(finalMessages);
          setIsTyping(false);
          await syncSessionToCloud(finalMessages, activeId);
          return;
        }
      } catch (err) {
        console.error("Failed to parse command in chat:", err);
      }
    }

    // AI responder loop
    (async () => {
      let aiResponse = '';
      const apiKey = appSettings.customGeminiApiKey?.trim();
      const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : 'None';
      console.log(`[DEBUG] Fetched Gemini API Key from Admin Panel: ${maskedKey}`);
      const preferredLanguage = userProfile?.language || 'English';

      // Define standard instructions for professional AI Study Co-Pilot with automatic language rules
      const detectedUserName = userProfile?.fullName || userProfile?.displayName || userProfile?.username || currentUser?.displayName || 'Scholar';
      const systemInstruction = `You are "${appSettings.appName}", a professional, sweet, and polite AI Teacher and Study Mentor.
You are currently helping a student named "${detectedUserName}". Always address them politely and maintain a professional mentor-student relationship.
You explain concepts step by step, help with homework, create study plans, and motivate students academically.
NEVER flirt. NEVER use romantic language. Focus only on education, productivity, and learning.

RESPONSE STYLE: Be EXTREMELY fast, brief, snappy, and concise. Keep your responses short (1 to 2 short sentences maximum, under 15-20 words). Never use long sentences unless explicitly asked for a detailed explanation. Respond instantly like a real, quick conversation.

=== USER PROFILE ===
- User Name: ${detectedUserName}
- User Interests: ${userProfile?.interest || 'General Studies'}
- User Goals: ${userProfile?.goal || 'Academic Success'}

=== DEVICE ACTIONS & UTILITIES ===
- You have the special capability to execute device actions like calling a contact, sending an SMS, or opening an app (e.g., WhatsApp, Calculator, YouTube).
- You MUST ONLY execute these actions if the user explicitly and directly asks you to do so in their message. 
- To execute an action, call the 'executeDeviceAction' tool.
- Example: If the user says "Open WhatsApp", you call executeDeviceAction(action='open_app', appName='whatsapp').
- After calling the tool, always confirm to the user that you've initiated the action in a polite and helpful way.

=== LANGUAGE RULES ===
- The user's preferred language setting in Settings is: "${preferredLanguage}". Always respect this priority!
- You MUST automatically detect the language used by the user in their messages.
- If the preferred language is "Bengali", or if the user's input/conversation language is detected as Bengali (either in Bengali script or Romanized Bengali like "kemon acho" / "amar nam"):
  * You MUST reply in proper, formal, and sweet BENGALI SCRIPT (বাংলা হরফ) only.
  * NEVER reply in English or Romanized Bengali.
- If the preferred language is "Hindi", or if the user's input/conversation language is detected as Hindi (either in Hindi script or Romanized Hindi like "kaise ho" / "naam kya hai"):
  * You MUST reply in proper, formal HINDI SCRIPT (देवनागरी) only.
  * NEVER reply in English or Romanized Hindi.
- If the user writes in English, reply in natural, supportive English.
- Always maintain the same language throughout the conversation unless the user explicitly switches it or asks for a translation.`;

      const tools: any[] = [
        {
          functionDeclarations: [
            {
              name: 'executeDeviceAction',
              description: 'Execute native device actions like phone call, SMS message dispatch, or opening external applications.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  action: { type: 'STRING', enum: ['call', 'message', 'open_app', 'screen_lock', 'toggle_setting'], description: 'The type of system command.' },
                  contactName: { type: 'STRING', description: 'Optional name of the contact.' },
                  phoneNumber: { type: 'STRING', description: 'Optional phone number.' },
                  messageContent: { type: 'STRING', description: 'Optional content of the message.' },
                  appName: { type: 'STRING', enum: ['calculator', 'terminal', 'file_browser', 'system_monitor', 'camera', 'whatsapp', 'telegram', 'chrome', 'youtube', 'gallery', 'clock', 'flashlight', 'google_search', 'alarm', 'reminder', 'calendar', 'media_playback', 'battery', 'storage', 'internet_status'], description: 'App to open.' },
                  settingName: { type: 'STRING', enum: ['wifi', 'bluetooth', 'cellular', 'hotspot', 'gps', 'airplane_mode', 'location', 'sound', 'volume', 'flashlight'], description: 'Hardware setting.' },
                  settingValue: { type: 'BOOLEAN', description: 'Boolean state.' }
                },
                required: ['action']
              }
            }
          ]
        }
      ];

      const contents = messagesWithUser.map(msg => {
        const parts: any[] = [{ text: msg.text }];
        if (msg.attachment && msg.attachment.base64Data) {
          try {
            const cleanBase64 = msg.attachment.base64Data.split(',')[1];
            if (cleanBase64) {
              parts.push({
                inlineData: {
                  data: cleanBase64,
                  mimeType: msg.attachment.mimeType || (msg.attachment.type === 'image' ? 'image/png' : 'application/pdf')
                }
              });
            }
          } catch (e) {
            console.error("Error formatting attachment for Gemini:", e);
          }
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      });

      const assistantMsgId = String(Date.now() + 1);
      
      const updateAssistantMessage = (chunk: string) => {
        aiResponse += chunk;
        setMessages(prev => {
          const exists = prev.find(m => m.id === assistantMsgId);
          if (exists) {
            return prev.map(m => m.id === assistantMsgId ? { ...m, text: aiResponse } : m);
          } else {
            return [...prev, { id: assistantMsgId, role: 'assistant', text: aiResponse, timestamp: new Date() }];
          }
        });
      };

      // Call our secure, server-side API proxy route for all chat requests
      try {
        const response = await fetch(getApiUrl('/api/chat'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify({ contents, systemInstruction, tools, customApiKey: appSettings?.customGeminiApiKey })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
           throw new Error('Backend not reachable (received HTML). On Android, you must provide a custom Gemini API Key in Settings or host the backend.');
        }
        
        let receivedValidData = false;

        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.functionCalls && Array.isArray(data.functionCalls) && onExecuteDeviceAction) {
             for (const call of data.functionCalls) {
               if (call.name === 'executeDeviceAction') {
                  await onExecuteDeviceAction(call.args);
                  updateAssistantMessage(`\n\n[System: Action initiated]`);
               }
             }
          }
          if (data.reply) {
            updateAssistantMessage(data.reply);
            receivedValidData = true;
          } else if (data.error) {
            updateAssistantMessage(data.error === "AI service is temporarily unavailable. Please try again later." ? data.error : `Server error: ${data.error}`);
            receivedValidData = true;
          }
        } else if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder("utf-8");
          let done = false;
          let buffer = "";

          while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || "";
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.replace('data: ', '').trim();
                  if (dataStr === '[DONE]') {
                    done = true;
                    break;
                  }
                  if (dataStr) {
                    try {
                      const parsed = JSON.parse(dataStr);
                      if (parsed.functionCalls && Array.isArray(parsed.functionCalls) && onExecuteDeviceAction) {
                         for (const call of parsed.functionCalls) {
                           if (call.name === 'executeDeviceAction') {
                              await onExecuteDeviceAction(call.args);
                              updateAssistantMessage(`\n\n[System: Action initiated]`);
                           }
                         }
                      }
                      if (parsed.text) {
                        updateAssistantMessage(parsed.text);
                        receivedValidData = true;
                      } else if (parsed.error) {
                        updateAssistantMessage(parsed.error === "AI service is temporarily unavailable. Please try again later." ? parsed.error : `Server error: ${parsed.error}`);
                      }
                    } catch (e) {
                      console.error("Error parsing SSE data", e, dataStr);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error: any) {
        console.error("Server API Chat Error:", error);
        // High-Quality Study Assistant simulated fallback responder
        const lower = userText.toLowerCase();
        if (lower.includes('physics') || lower.includes('force') || lower.includes('gravity')) {
          updateAssistantMessage("Physics niye golpo kora amar khub pochhondo! Newtonian Mechanics ba Einsteinian relativity-r kon topics ta discuss korbo bolo? Coulomb force formula holo F = k * (q1*q2)/r^2. Eitar math optimization solve korte hobe?");
        } else if (lower.includes('math') || lower.includes('calculus') || lower.includes('derivative') || lower.includes('integration')) {
          updateAssistantMessage("Calculus limits and derivatives are very simple once you get the intuition! sin(x) er derivative holo cos(x). Kono critical integration ba polynomial derivative expression solver dorkar hole amake type kore pathao, ami step-by-step bujhiye debo!");
        } else if (lower.includes('pdf') || lower.includes('summary') || attachment?.type === 'pdf') {
          updateAssistantMessage(`📚 PDF Summary: **"${attachment?.name || 'Calculus Chapter 3'} Review"**\n\n- **Core Theme:** Introduction to Differential equations & tangent lines.\n- **Key Equations:** dy/dx = lim(h->0) [f(x+h) - f(x)] / h\n- **Action Items:** Master the Chain Rule and product rule for the upcoming midterms!`);
        } else if (lower.includes('bengali') || lower.includes('bengla') || lower.includes('bhasha')) {
          updateAssistantMessage("Ami to Bengali khub bhalo bhabe bujhi! Settings change kore nite paro ba ekhane chat-eo kotha bolte paro. Tomar ajke porar topic-ta amake bolo.");
        } else {
          updateAssistantMessage(`Bolo! Ami ${appSettings.aiAssistantName || 'Sweety'}, tomar premium study co-pilot. Tomar equations query, coding problems, code bugs, naki calculus logic help korbo bolo? Ami instantly analyze kore complete logic prepare korchi!`);
        }
      }


      setMessages(prev => {
        const finalMessages = prev;
        setIsTyping(false);
        addSystemLog(`[CHAT] Received AI response.`);
        // Update Firestore session with assistant response
        syncSessionToCloud(finalMessages, activeId).catch(console.error);
        return finalMessages;
      });

      // Increment free user daily text limit counter upon successful completion
      if (!isPremium && currentUser) {
        const todayStr = new Date().toISOString().split('T')[0];
        const textUsage = userProfile?.textUsage;
        const currentCount = (textUsage && textUsage.date === todayStr) ? (textUsage.count || 0) : 0;
        try {
          await setDoc(doc(db, 'users', currentUser.uid), {
            textUsage: {
              date: todayStr,
              count: currentCount + 1
            }
          }, { merge: true });
        } catch (err) {
          console.error("Failed to update daily text message limit:", err);
        }
      }
    })();
  };

  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    
    // Size check
    if (file.size > 15 * 1024 * 1024) {
      alert("File size is too large! Please keep it under 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        type: isImage ? 'image' : 'pdf',
        base64Data: reader.result as string,
        mimeType: file.type
      });
      addSystemLog(`[UPLOAD] ${file.name} attached successfully.`);
    };
    reader.onerror = () => {
      alert("Failed to read selected file.");
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatedUpload = (type: 'pdf' | 'image') => {
    if (type === 'pdf') {
      setAttachedFile({ 
        name: 'Physics_Electromagnetism_Ch4.pdf', 
        type: 'pdf',
        base64Data: 'data:application/pdf;base64,JVBERi0xLjQKJaaaaa==',
        mimeType: 'application/pdf'
      });
      addSystemLog(`[UPLOAD] Simulated PDF study guide attached.`);
    } else {
      setAttachedFile({ 
        name: 'Calculus_Equation_Scan.png', 
        type: 'image',
        base64Data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        mimeType: 'image/png'
      });
      addSystemLog(`[SCAN] Simulated mathematical equation screenshot attached.`);
    }
  };

  // Filter histories based on search query
  const filteredHistories = histories.filter(h => 
    h.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-6 pb-24 text-white min-h-[82vh] items-stretch relative">
      
      {/* Drawer Overlay */}
      <AnimatePresence>
        {showHistoryMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistoryMenu(false)}
              className="fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-[320px] bg-slate-900 border-l border-white/10 z-[101] shadow-2xl flex flex-col p-4"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <History size={20} className="text-pink-400" />
                  Study Histories
                </h3>
                <button 
                  onClick={() => setShowHistoryMenu(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Create Fresh Workspace Button */}
              <button
                onClick={() => {
                  handleStartNewSession();
                  setShowHistoryMenu(false);
                }}
                className="w-full py-3.5 mb-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 active:scale-95 text-white font-bold text-xs uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-purple-500/10 shrink-0"
              >
                <Plus size={16} />
                <span>New Study Session</span>
              </button>

              {/* Search bar */}
              <div className="relative mb-4 shrink-0">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  placeholder="Search chat sessions..."
                  className="w-full bg-black/40 border border-white/10 focus:border-pink-500 rounded-xl pl-8 pr-3 py-2 text-[11px] focus:outline-none transition-colors text-white"
                />
              </div>

              {/* Sessions List */}
              <div className="space-y-2 flex-1 overflow-y-auto pr-1 scrollbar-thin">
                {filteredHistories.length === 0 ? (
                  <p className="text-[10px] text-gray-500 font-semibold text-center py-10 leading-relaxed px-4">
                    No matching study histories saved. Type a message in workspace to auto-save!
                  </p>
                ) : (
                  filteredHistories.map((h) => {
                    const isActive = activeHistoryId === h.id;
                    const isEditing = editingHistoryId === h.id;
                    
                    return (
                      <div
                        key={h.id}
                        onClick={() => {
                          if (!isEditing) {
                            handleContinueSession(h);
                            setShowHistoryMenu(false);
                          }
                        }}
                        className={`p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer flex flex-col gap-2 relative group ${
                          isActive 
                            ? 'bg-purple-500/10 border-purple-500/30 text-white' 
                            : 'bg-white/5 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <form 
                                onSubmit={(e) => handleRenameSession(h.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex gap-1.5"
                              >
                                <input 
                                  type="text"
                                  value={editTitleInput}
                                  onChange={(e) => setEditTitleInput(e.currentTarget.value)}
                                  className="bg-black/50 border border-pink-500 rounded px-2 py-0.5 text-[11px] text-white w-full focus:outline-none"
                                  autoFocus
                                  onBlur={() => handleRenameSession(h.id)}
                                />
                              </form>
                            ) : (
                              <h5 className="font-bold text-xs truncate pr-1">
                                {h.title || 'Untitled Session'}
                              </h5>
                            )}
                            <p className="text-[9px] text-gray-500 font-semibold mt-0.5">
                              {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : 'Active now'}
                            </p>
                          </div>

                          {/* Favorite star */}
                          <button
                            onClick={(e) => handleToggleFavourite(h.id, !!h.favourite, e)}
                            className={`p-1 hover:bg-white/10 rounded transition-colors shrink-0 ${h.favourite ? 'text-amber-400' : 'text-gray-500'}`}
                          >
                            <Star size={11} fill={h.favourite ? "currentColor" : "none"} />
                          </button>
                        </div>

                        {/* Action buttons visible on hover */}
                        <div className="flex gap-2 items-center justify-end border-t border-white/5 pt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHistoryId(h.id);
                              setEditTitleInput(h.title || '');
                            }}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Rename"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={(e) => handleExportPDF(h, e)}
                            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                            title="Export PDF"
                          >
                            <Download size={11} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(h.id, e)}
                            className="p-1 hover:bg-rose-500/20 rounded text-rose-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Right Column: Chat Interface */}
      <div className="flex-1 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-none shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Chat Title bar */}
        <div className="p-4 bg-black/25 border-b border-white/10 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-600 flex items-center justify-center font-bold text-sm shadow-md">
              S
            </div>
            <div>
              <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                {appSettings.appName} Workspace
                <Sparkles size={13} className="text-pink-400 animate-pulse" />
              </h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {activeHistoryId ? `Session: ${histories.find(h => h.id === activeHistoryId)?.title || 'Active Session'}` : 'New Workspace'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHistoryMenu(true)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
          >
            <History size={20} className="text-gray-300" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative z-10 max-h-[460px] scrollbar-thin">
          {messages.map((m) => {
            const isBot = m.role === 'assistant';
            return (
              <div 
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                  isBot ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/35' : 'bg-pink-600/20 text-pink-400 border border-pink-500/35'
                }`}>
                  {isBot ? <Bot size={16} /> : <User size={16} />}
                </div>

                {/* Bubble */}
                <div className="space-y-1.5">
                  {/* Sender & Controls */}
                  <div className={`flex items-center gap-2 text-[9px] uppercase tracking-widest font-extrabold text-gray-400 ${!isBot ? 'justify-end' : ''}`}>
                    {isBot ? (
                      <span>{appSettings.aiAssistantName} Assistant</span>
                    ) : userProfile?.isPremium ? (
                      <span className="flex items-center gap-1 text-amber-400 font-black">
                        <Crown size={10} className="text-amber-400 animate-pulse" /> ⭐ PREMIUM USER
                      </span>
                    ) : (
                      <span>{userProfile?.fullName || 'Student'}</span>
                    )}
                    <span>•</span>
                    <span>{m.timestamp instanceof Date ? m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
                    
                    {/* Utility actions inside chat */}
                    <div className="flex gap-1 items-center opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleCopy(m.text, m.id)}
                        className="p-1 hover:bg-white/10 rounded cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === m.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                      </button>
                      <button 
                        onClick={() => handleTogglePin(m.id)}
                        className={`p-1 hover:bg-white/10 rounded cursor-pointer ${m.isPinned ? 'text-pink-400' : ''}`}
                        title="Pin note"
                      >
                        <Pin size={10} className="rotate-45" />
                      </button>
                    </div>
                  </div>

                  {/* Text Container with Markdown/Formatted layout */}
                  <div 
                    className={`p-3.5 border rounded-2xl text-xs leading-relaxed font-sans relative group transition-all whitespace-pre-wrap ${
                      isBot 
                        ? 'bg-indigo-950/20 border-indigo-500/15 text-gray-200' 
                        : 'bg-pink-950/25 border-pink-500/20 text-white'
                    }`}
                  >
                    {m.attachment && (
                      <div className="flex items-center gap-2 p-2 bg-black/30 border border-white/5 rounded-xl text-[10px] mb-2 font-mono text-pink-300">
                        {m.attachment.type === 'pdf' ? <FileText size={14} /> : <Image size={14} />}
                        <span>{m.attachment.name}</span>
                      </div>
                    )}
                    {m.text}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Animation */}
          {isTyping && (
            <div className="flex gap-3 mr-auto max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/35 flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase tracking-widest font-extrabold text-gray-400">{appSettings.aiAssistantName} Assistant</span>
                <div className="p-3 bg-indigo-950/20 border border-indigo-500/15 rounded-2xl flex items-center gap-1.5 py-4 px-5">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-black/20 border-t border-white/10 relative z-10 flex flex-col gap-3">
          
          {/* File attachment preview */}
          {attachedFile && (
            <div className="flex items-center justify-between bg-white/5 border border-pink-500/20 p-2 rounded-xl text-[11px] text-pink-300 font-mono">
              <div className="flex items-center gap-2">
                {attachedFile.type === 'pdf' ? <FileText size={14} /> : <Image size={14} />}
                <span>{attachedFile.name} (Ready to send)</span>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-white/10 rounded font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Action helpers */}
          <div className="flex gap-2 text-[10px] font-bold font-mono">
            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.ppt,.pptx,.png,.jpg,.webp,.mp4,.mp3,.zip" onChange={handleFileUpload} />
  <button
    onClick={() => fileInputRef.current?.click()}
    className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-indigo-500/20 text-indigo-400 transition-colors border border-white/5 hover:border-indigo-500/30 text-left group"
  >
    <div className="p-2 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20"><FileText size={20} /></div>
    <div className="flex-1">
      <div className="text-sm font-bold text-white">Upload File</div>
      <div className="text-xs text-gray-400">PDF, DOCX, Images, MP3, MP4</div>
    </div>
  </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer text-gray-300 hover:text-white"
            >
              <Image size={12} className="text-pink-400" />
              <span>Scan Question</span>
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask ${appSettings.aiAssistantName || 'Sweety'} anything about calculus, mechanics, or study planning...`}
              className="flex-1 bg-black/40 border border-white/10 px-4 py-3 rounded-2xl text-xs placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-white"
            />
            <button 
              type="submit"
              className="p-3 bg-gradient-to-r from-pink-500 to-indigo-600 hover:opacity-90 active:scale-95 text-white rounded-2xl flex items-center justify-center cursor-pointer shadow-lg shadow-pink-500/10 transition-all shrink-0"
              title="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
