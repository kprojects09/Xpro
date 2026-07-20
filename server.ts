import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { GoogleGenAI } from "@google/genai";
import { getOrCreateUser } from './src/db/users.ts';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimited = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED') || error?.message?.includes('quota');
      if (isRateLimited) {
        attempt++;
        if (attempt >= maxRetries) {
          throw new Error("AI service is temporarily unavailable. Please try again later.");
        }
        const waitTime = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`429 Too Many Requests, retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        throw error;
      }
    }
  }
  throw new Error("AI service is temporarily unavailable. Please try again later.");
}

const aiResponseCache = new Map<string, { response: string, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

function getCachedResponse(key: string) {
  const cached = aiResponseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }
  return null;
}

function setCachedResponse(key: string, response: string) {
  aiResponseCache.set(key, { response, timestamp: Date.now() });
}

async function createServer() {
  const app = express();
  const port = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Set up uploads directory for media sharing in live messages
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // User Sync Route
  app.post('/api/sync-user', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { fullName, username, avatarUrl } = req.body;
      const user = await getOrCreateUser(
        req.user!.uid,
        req.user!.email!,
        fullName,
        username,
        avatarUrl
      );
      res.json(user);
    } catch (error: any) {
      console.error('User sync error:', error);
      res.status(500).json({ error: 'Failed to sync user', details: error.message });
    }
  });

  // File upload route for media sharing in chat (images, files, voice notes)
  app.post('/api/upload', async (req: Request, res: Response) => {
    try {
      const { filename, mimeType, base64Data } = req.body;
      if (!filename || !mimeType || !base64Data) {
        res.status(400).json({ error: 'Filename, mimeType, and base64Data are required' });
        return;
      }

      // Strip potential header from base64 string
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');

      // Create unique filename
      const fileExt = path.extname(filename) || `.${mimeType.split('/')[1] || 'bin'}`;
      const baseName = path.basename(filename, fileExt).replace(/[^a-zA-Z0-9]/g, '_');
      const uniqueName = `${baseName}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;

      const targetPath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(targetPath, buffer);

      res.json({ 
        url: `/uploads/${uniqueName}`, 
        filename: uniqueName, 
        originalName: filename, 
        size: buffer.length 
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
  });

  // Initialize Firebase Admin on server-side
  let db: any = null;
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Initialize admin if not already initialized
      if (getApps().length === 0) {
        initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
      
      // Use default database or specified database ID
      if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)') {
        db = getFirestore(firebaseConfig.firestoreDatabaseId);
      } else {
        db = getFirestore();
      }
      
      console.log('Firebase Admin initialized on Express backend');
    } catch (e) {
      console.error('Firebase server-side init error:', e);
    }
  } else {
    console.warn('firebase-applet-config.json not found, server-side database is disabled');
  }

  // Push Notification API route
  app.post('/api/send-push', async (req: Request, res: Response) => {
    try {
      const { userId, title, body, data } = req.body;
      console.log(`[PUSH] Attempting to send push to userId: ${userId}`);
      
      if (!userId || !title || !body) {
        res.status(400).json({ error: 'userId, title, and body are required' });
        return;
      }

      if (!db) {
        console.error('[PUSH_ERR] Database not initialized');
        res.status(500).json({ error: 'Server database integration is not active.' });
        return;
      }

      // Fetch user's FCM token from Firestore
      let userDoc;
      try {
        userDoc = await db.collection('users').doc(userId).get();
      } catch (dbErr: any) {
        console.error('[PUSH_ERR] Firestore read failed:', dbErr);
        throw dbErr;
      }

      if (!userDoc.exists) {
        console.warn(`[PUSH_WARN] User ${userId} not found in Firestore`);
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        console.warn(`[PUSH_WARN] User ${userId} has no FCM token`);
        res.status(400).json({ error: 'User does not have a registered FCM token' });
        return;
      }

      const message = {
        notification: {
          title,
          body,
        },
        data: data || {},
        token: fcmToken,
      };

      console.log(`[PUSH] Sending message to FCM for token: ${fcmToken.substring(0, 10)}...`);
      const response = await getMessaging().send(message);
      console.log(`[PUSH_SUCCESS] Message sent: ${response}`);
      res.json({ success: true, messageId: response });
    } catch (error: any) {
      console.error('[PUSH_ERR] Final catch:', error);
      res.status(500).json({ error: 'Failed to send push notification', details: error.message });
    }
  });

  // Lazy initialization of Gemini client
  let genAI: GoogleGenAI | null = null;

  function getGenAI(customApiKey?: string) {
    if (customApiKey) {
      return new GoogleGenAI({ 
        apiKey: customApiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is required');
      }
      genAI = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return genAI;
  }

  // Image Generation API route
  app.post('/generate-image', async (req: Request, res: Response) => {
    try {
      const { prompt, negativePrompt, style, aspectRatio, quality, count, customApiKey } = req.body;

      if (!prompt) {
         res.status(400).json({ error: 'Prompt is required' });
         return;
      }

      const ai = getGenAI(customApiKey);

      // Formulate complete prompt combining negative prompt & style
      let fullPrompt = prompt;
      if (style && style !== 'None' && style !== 'Realistic') {
        fullPrompt = `A high-quality image in the style of "${style}". Prompt: ${prompt}`;
      } else if (style === 'Realistic') {
        fullPrompt = `A photorealistic, highly detailed image. Prompt: ${prompt}`;
      }

      if (negativePrompt) {
        fullPrompt += `. Negative prompt (elements to strictly avoid): ${negativePrompt}`;
      }

      // Map aspect ratios to what the SDK supports: "1:1", "3:4", "4:3", "9:16", "16:9"
      const aspectMap: Record<string, string> = {
        "1:1": "1:1",
        "4:3": "4:3",
        "3:4": "3:4",
        "16:9": "16:9",
        "9:16": "9:16",
        "2:3": "3:4", 
        "3:2": "4:3",
        "Square": "1:1",
        "Portrait": "3:4",
        "Landscape": "16:9"
      };
      const resolvedAspect = aspectMap[aspectRatio] || "1:1";

      // Map quality to image size: "512px", "1K", "2K", "4K"
      let resolvedSize = "1K";
      if (quality === "HD") resolvedSize = "512px";
      else if (quality === "2K") resolvedSize = "2K";
      else if (quality === "4K") resolvedSize = "4K";

      // Use gemini-3.1-flash-image
      const modelName = 'gemini-3.1-flash-image';

      const numImages = Math.max(1, Math.min(4, count || 1));
      const imageResults: string[] = [];

      for (let i = 0; i < numImages; i++) {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              { text: fullPrompt }
            ]
          },
          config: {
            imageConfig: {
              aspectRatio: resolvedAspect as any,
              imageSize: resolvedSize as any,
            }
          }
        });

        if (!response.candidates?.[0]?.content?.parts) {
          throw new Error("No image candidates returned from model. Please verify your model quota.");
        }

        let base64Data: string | null = null;
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Data = part.inlineData.data;
            break;
          }
        }

        if (base64Data) {
          imageResults.push(`data:image/png;base64,${base64Data}`);
        } else {
          throw new Error("Generated content did not include image inline data. Check if your API key is configured with the Image Generation model.");
        }
      }

      res.json({ images: imageResults });
    } catch (error: any) {
      console.error('Image generation route error:', error);
      res.status(500).json({ 
        error: 'Failed to generate image', 
        details: error.message 
      });
    }
  });

  // Chat API route
  app.post('/chat', async (req: Request, res: Response) => {
    try {
      const { message } = req.body;

      if (!message) {
         res.status(400).json({ error: 'Message is required' });
         return;
      }

      const cacheKey = typeof message === 'string' ? message : JSON.stringify(message);
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        res.json({ reply: cached });
        return;
      }

      const ai = getGenAI();
      const response = await fetchWithRetry(() => ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
      }));

      if (response.text) {
        setCachedResponse(cacheKey, response.text);
      }
      res.json({ reply: response.text });
    } catch (error: any) {
      console.error('Chat error:', error);
      const msg = error?.message === "AI service is temporarily unavailable. Please try again later." ? error.message : "AI service error: " + (error?.message || "Unknown error");
      res.status(500).json({ 
        error: msg, 
        details: error?.message || 'Unknown error'
      });
    }
  });

  // Contextual Chat API route for Low Latency and automatic language/rule processing
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { contents, systemInstruction, customApiKey } = req.body;

      if (!contents || !Array.isArray(contents)) {
         res.status(400).json({ error: 'Contents history is required' });
         return;
      }

      const cacheKey = JSON.stringify({ contents, systemInstruction });
      const cached = getCachedResponse(cacheKey);

      const ai = getGenAI(customApiKey);
      
      if (req.headers.accept?.includes('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (cached) {
          res.write(`data: ${JSON.stringify({ text: cached })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        const streamResponse = await fetchWithRetry(() => ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.4
          }
        }));

        let fullText = "";
        for await (const chunk of streamResponse) {
          if (chunk.text) {
            fullText += chunk.text;
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        }
        if (fullText) {
          setCachedResponse(cacheKey, fullText);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        if (cached) {
          res.json({ reply: cached });
          return;
        }
        const response = await fetchWithRetry(() => ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || undefined,
            temperature: 0.4
          }
        }));

        if (response.text) {
          setCachedResponse(cacheKey, response.text);
        }
        res.json({ reply: response.text });
      }
    } catch (error: any) {
      console.error('API Chat error:', error);
      const msg = error?.message === "AI service is temporarily unavailable. Please try again later." ? error.message : "AI service error: " + (error?.message || "Unknown error");
      if (req.headers.accept?.includes('text/event-stream')) {
        res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ 
          error: msg, 
          details: error?.message || 'Unknown error' 
        });
      }
    }
  });

  // Secure Redeem Code Validation and Redemption Route
  app.post('/api/redeem-code', async (req: Request, res: Response) => {
    const { code, userId, email } = req.body;

    if (!code || !userId || !email) {
      res.status(400).json({ error: 'Code, User ID, and Email are required' });
      return;
    }

    if (!db) {
      res.status(500).json({ error: 'Server database integration is not active.' });
      return;
    }

    try {
      const uppercaseCode = code.trim().toUpperCase();

      // Query for redeem code using Admin SDK
      const querySnapshot = await db.collection('redeem_codes')
        .where('code', '==', uppercaseCode)
        .get();

      if (querySnapshot.empty) {
        res.status(404).json({ error: 'Invalid Redeem Code. Please verify and try again.' });
        return;
      }

      const docSnap = querySnapshot.docs[0];
      const codeData = docSnap.data() as any;
      const docId = docSnap.id;

      // Check if enabled
      if (codeData.isEnabled === false) {
        res.status(400).json({ error: 'This Redeem Code is currently disabled.' });
        return;
      }

      // Check if revoked
      if (codeData.isRevoked === true) {
        res.status(400).json({ error: 'This Redeem Code has been revoked.' });
        return;
      }

      // Check already redeemed by this specific user
      const alreadyRedeemed = codeData.redeemedBy?.some((r: any) => r.userId === userId);
      if (alreadyRedeemed) {
        res.status(400).json({ error: 'You have already redeemed this code!' });
        return;
      }

      // Check maximum activation count
      if (codeData.isSingleUse && codeData.activationCount >= 1) {
        res.status(400).json({ error: 'This single-use code has already been redeemed.' });
        return;
      }

      if (codeData.activationCount >= codeData.maxActivations) {
        res.status(400).json({ error: 'This code has reached its maximum activation limit.' });
        return;
      }

      // Calculate premium expiration duration
      let premiumExpiresAt: string | null = null;
      const now = new Date();

      switch (codeData.validityType) {
        case '1_day':
          premiumExpiresAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7_days':
          premiumExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '15_days':
          premiumExpiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30_days':
          premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90_days':
          premiumExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '180_days':
          premiumExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '365_days':
          premiumExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case 'lifetime':
          premiumExpiresAt = null; // Lifetime
          break;
        case 'custom_date':
          if (codeData.customExpiryDate) {
            const customExpiry = new Date(codeData.customExpiryDate);
            if (customExpiry.getTime() <= now.getTime()) {
              res.status(400).json({ error: 'This code\'s validity period has already expired.' });
              return;
            }
            premiumExpiresAt = customExpiry.toISOString();
          } else {
            res.status(400).json({ error: 'Invalid custom validity date configuration.' });
            return;
          }
          break;
        default:
          premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      const redeemRecord = {
        userId,
        email,
        redeemedAt: now.toISOString()
      };

      // Update redeem code document
      const updatedRedeemedBy = [...(codeData.redeemedBy || []), redeemRecord];
      await db.collection('redeem_codes').doc(docId).update({
        activationCount: (codeData.activationCount || 0) + 1,
        redeemedBy: updatedRedeemedBy
      });

      // Update user profile document using set merge: true
      await db.collection('users').doc(userId).set({
        isPremium: true,
        premiumType: 'Redeem Code',
        premiumPlan: codeData.validityType,
        premiumGrantedAt: now.toISOString(),
        premiumExpiresAt,
        redeemedCode: uppercaseCode
      }, { merge: true });

      // Log in user premium history subcollection
      await db.collection('users').doc(userId).collection('premium_history').add({
        action: 'Redeemed Code',
        type: 'Redeem Code',
        code: uppercaseCode,
        actionDate: now.toISOString(),
        expiresAt: premiumExpiresAt,
        grantedBy: 'Redeem Code System'
      });

      // Write congratulatory notification
      const planName = codeData.validityType === 'lifetime' 
        ? 'Lifetime' 
        : codeData.validityType.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      
      const friendlyExpiry = premiumExpiresAt 
        ? new Date(premiumExpiresAt).toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        : 'Never (Lifetime)';

      await db.collection('users').doc(userId).collection('notifications').add({
        title: 'Premium Membership Activated 🎉',
        message: `Congratulations! You have successfully redeemed code "${uppercaseCode}" to activate your ${planName} Premium Membership!\n\nEnjoy unlimited AI Voice interactions, priority study assistance, zero daily limits, and all advanced study tools.\n\nExpiry Date: ${friendlyExpiry}`,
        createdAt: now.toISOString(),
        read: false,
        type: 'premium_granted'
      });

      res.json({
        success: true,
        premiumExpiresAt,
        validityType: codeData.validityType,
        message: 'Premium successfully activated!'
      });

    } catch (err: any) {
      console.error('Error in code redemption:', err);
      res.status(500).json({ error: 'Server error during code redemption. Please try again.', details: err.message });
    }
  });

  if (!isProd) {
    // In development: use Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // In production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

createServer();
