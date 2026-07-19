var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_app = require("firebase-admin/app");
var import_firestore = require("firebase-admin/firestore");
var import_messaging = require("firebase-admin/messaging");
var import_genai = require("@google/genai");

// src/db/index.ts
var import_node_postgres = require("drizzle-orm/node-postgres");
var import_pg = require("pg");

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
var import_pg_core = require("drizzle-orm/pg-core");
var import_drizzle_orm = require("drizzle-orm");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  uid: (0, import_pg_core.text)("uid").notNull().unique(),
  email: (0, import_pg_core.text)("email").notNull(),
  fullName: (0, import_pg_core.text)("full_name"),
  username: (0, import_pg_core.text)("username").unique(),
  avatarUrl: (0, import_pg_core.text)("avatar_url"),
  fcmToken: (0, import_pg_core.text)("fcm_token"),
  isPremium: (0, import_pg_core.boolean)("is_premium").default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow(),
  updatedAt: (0, import_pg_core.timestamp)("updated_at").defaultNow()
});
var notifications = (0, import_pg_core.pgTable)("notifications", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.text)("user_id").notNull().references(() => users.uid),
  title: (0, import_pg_core.text)("title").notNull(),
  body: (0, import_pg_core.text)("body").notNull(),
  type: (0, import_pg_core.text)("type"),
  data: (0, import_pg_core.jsonb)("data"),
  read: (0, import_pg_core.boolean)("read").default(false),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow()
});
var usersRelations = (0, import_drizzle_orm.relations)(users, ({ many }) => ({
  notifications: many(notifications)
}));
var notificationsRelations = (0, import_drizzle_orm.relations)(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.uid]
  })
}));

// src/db/index.ts
var createPool = () => {
  return new import_pg.Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15e3
  });
};
var pool = createPool();
pool.on("error", (err) => {
  console.error("Unexpected error on idle SQL pool client:", err);
});
var db = (0, import_node_postgres.drizzle)(pool, { schema: schema_exports });

// src/db/users.ts
var import_drizzle_orm2 = require("drizzle-orm");
async function getOrCreateUser(uid, email, fullName, username, avatarUrl) {
  try {
    const result = await db.insert(users).values({
      uid,
      email,
      fullName,
      username,
      avatarUrl
    }).onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        fullName: fullName ?? void 0,
        username: username ?? void 0,
        avatarUrl: avatarUrl ?? void 0,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// src/middleware/auth.ts
var import_auth = require("firebase-admin/auth");
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await (0, import_auth.getAuth)().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// server.ts
var import_dotenv = __toESM(require("dotenv"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
import_dotenv.default.config();
var isProd = process.env.NODE_ENV === "production";
async function createServer() {
  const app = (0, import_express.default)();
  const port = 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const uploadsDir = import_path.default.resolve(process.cwd(), "uploads");
  if (!import_fs.default.existsSync(uploadsDir)) {
    import_fs.default.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", import_express.default.static(uploadsDir));
  app.post("/api/sync-user", requireAuth, async (req, res) => {
    try {
      const { fullName, username, avatarUrl } = req.body;
      const user = await getOrCreateUser(
        req.user.uid,
        req.user.email,
        fullName,
        username,
        avatarUrl
      );
      res.json(user);
    } catch (error) {
      console.error("User sync error:", error);
      res.status(500).json({ error: "Failed to sync user", details: error.message });
    }
  });
  app.post("/api/upload", async (req, res) => {
    try {
      const { filename, mimeType, base64Data } = req.body;
      if (!filename || !mimeType || !base64Data) {
        res.status(400).json({ error: "Filename, mimeType, and base64Data are required" });
        return;
      }
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, "base64");
      const fileExt = import_path.default.extname(filename) || `.${mimeType.split("/")[1] || "bin"}`;
      const baseName = import_path.default.basename(filename, fileExt).replace(/[^a-zA-Z0-9]/g, "_");
      const uniqueName = `${baseName}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${fileExt}`;
      const targetPath = import_path.default.join(uploadsDir, uniqueName);
      import_fs.default.writeFileSync(targetPath, buffer);
      res.json({
        url: `/uploads/${uniqueName}`,
        filename: uniqueName,
        originalName: filename,
        size: buffer.length
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to upload file", details: error.message });
    }
  });
  let db2 = null;
  const configPath = import_path.default.resolve(process.cwd(), "firebase-applet-config.json");
  if (import_fs.default.existsSync(configPath)) {
    try {
      const firebaseConfig = JSON.parse(import_fs.default.readFileSync(configPath, "utf8"));
      if ((0, import_app.getApps)().length === 0) {
        (0, import_app.initializeApp)({
          projectId: firebaseConfig.projectId
        });
      }
      if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
        db2 = (0, import_firestore.getFirestore)(firebaseConfig.firestoreDatabaseId);
      } else {
        db2 = (0, import_firestore.getFirestore)();
      }
      console.log("Firebase Admin initialized on Express backend");
    } catch (e) {
      console.error("Firebase server-side init error:", e);
    }
  } else {
    console.warn("firebase-applet-config.json not found, server-side database is disabled");
  }
  app.post("/api/send-push", async (req, res) => {
    try {
      const { userId, title, body, data } = req.body;
      console.log(`[PUSH] Attempting to send push to userId: ${userId}`);
      if (!userId || !title || !body) {
        res.status(400).json({ error: "userId, title, and body are required" });
        return;
      }
      if (!db2) {
        console.error("[PUSH_ERR] Database not initialized");
        res.status(500).json({ error: "Server database integration is not active." });
        return;
      }
      let userDoc;
      try {
        userDoc = await db2.collection("users").doc(userId).get();
      } catch (dbErr) {
        console.error("[PUSH_ERR] Firestore read failed:", dbErr);
        throw dbErr;
      }
      if (!userDoc.exists) {
        console.warn(`[PUSH_WARN] User ${userId} not found in Firestore`);
        res.status(404).json({ error: "User not found" });
        return;
      }
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;
      if (!fcmToken) {
        console.warn(`[PUSH_WARN] User ${userId} has no FCM token`);
        res.status(400).json({ error: "User does not have a registered FCM token" });
        return;
      }
      const message = {
        notification: {
          title,
          body
        },
        data: data || {},
        token: fcmToken
      };
      console.log(`[PUSH] Sending message to FCM for token: ${fcmToken.substring(0, 10)}...`);
      const response = await (0, import_messaging.getMessaging)().send(message);
      console.log(`[PUSH_SUCCESS] Message sent: ${response}`);
      res.json({ success: true, messageId: response });
    } catch (error) {
      console.error("[PUSH_ERR] Final catch:", error);
      res.status(500).json({ error: "Failed to send push notification", details: error.message });
    }
  });
  let genAI = null;
  function getGenAI() {
    if (!genAI) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required");
      }
      genAI = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
    return genAI;
  }
  app.post("/generate-image", async (req, res) => {
    try {
      const { prompt, negativePrompt, style, aspectRatio, quality, count } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }
      const ai = getGenAI();
      let fullPrompt = prompt;
      if (style && style !== "None" && style !== "Realistic") {
        fullPrompt = `A high-quality image in the style of "${style}". Prompt: ${prompt}`;
      } else if (style === "Realistic") {
        fullPrompt = `A photorealistic, highly detailed image. Prompt: ${prompt}`;
      }
      if (negativePrompt) {
        fullPrompt += `. Negative prompt (elements to strictly avoid): ${negativePrompt}`;
      }
      const aspectMap = {
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
      let resolvedSize = "1K";
      if (quality === "HD") resolvedSize = "512px";
      else if (quality === "2K") resolvedSize = "2K";
      else if (quality === "4K") resolvedSize = "4K";
      const modelName = "gemini-3.1-flash-image";
      const numImages = Math.max(1, Math.min(4, count || 1));
      const imageResults = [];
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
              aspectRatio: resolvedAspect,
              imageSize: resolvedSize
            }
          }
        });
        if (!response.candidates?.[0]?.content?.parts) {
          throw new Error("No image candidates returned from model. Please verify your model quota.");
        }
        let base64Data = null;
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
    } catch (error) {
      console.error("Image generation route error:", error);
      res.status(500).json({
        error: "Failed to generate image",
        details: error.message
      });
    }
  });
  app.post("/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        res.status(400).json({ error: "Message is required" });
        return;
      }
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: message
      });
      res.json({ reply: response.text });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({
        error: error.message,
        details: error.message
      });
    }
  });
  app.post("/api/chat", async (req, res) => {
    try {
      const { contents, systemInstruction } = req.body;
      if (!contents || !Array.isArray(contents)) {
        res.status(400).json({ error: "Contents history is required" });
        return;
      }
      const ai = getGenAI();
      if (req.headers.accept?.includes("text/event-stream")) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        const streamResponse = await ai.models.generateContentStream({
          model: "gemini-2.0-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || void 0,
            temperature: 0.4
          }
        });
        for await (const chunk of streamResponse) {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}

`);
          }
        }
        res.write("data: [DONE]\n\n");
        res.end();
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents,
          config: {
            systemInstruction: systemInstruction || void 0,
            temperature: 0.4
          }
        });
        res.json({ reply: response.text });
      }
    } catch (error) {
      console.error("API Chat error:", error);
      if (req.headers.accept?.includes("text/event-stream")) {
        res.write(`data: ${JSON.stringify({ error: error.message })}

`);
        res.end();
      } else {
        res.status(500).json({
          error: error.message,
          details: error?.message || "Unknown error"
        });
      }
    }
  });
  app.post("/api/redeem-code", async (req, res) => {
    const { code, userId, email } = req.body;
    if (!code || !userId || !email) {
      res.status(400).json({ error: "Code, User ID, and Email are required" });
      return;
    }
    if (!db2) {
      res.status(500).json({ error: "Server database integration is not active." });
      return;
    }
    try {
      const uppercaseCode = code.trim().toUpperCase();
      const querySnapshot = await db2.collection("redeem_codes").where("code", "==", uppercaseCode).get();
      if (querySnapshot.empty) {
        res.status(404).json({ error: "Invalid Redeem Code. Please verify and try again." });
        return;
      }
      const docSnap = querySnapshot.docs[0];
      const codeData = docSnap.data();
      const docId = docSnap.id;
      if (codeData.isEnabled === false) {
        res.status(400).json({ error: "This Redeem Code is currently disabled." });
        return;
      }
      if (codeData.isRevoked === true) {
        res.status(400).json({ error: "This Redeem Code has been revoked." });
        return;
      }
      const alreadyRedeemed = codeData.redeemedBy?.some((r) => r.userId === userId);
      if (alreadyRedeemed) {
        res.status(400).json({ error: "You have already redeemed this code!" });
        return;
      }
      if (codeData.isSingleUse && codeData.activationCount >= 1) {
        res.status(400).json({ error: "This single-use code has already been redeemed." });
        return;
      }
      if (codeData.activationCount >= codeData.maxActivations) {
        res.status(400).json({ error: "This code has reached its maximum activation limit." });
        return;
      }
      let premiumExpiresAt = null;
      const now = /* @__PURE__ */ new Date();
      switch (codeData.validityType) {
        case "1_day":
          premiumExpiresAt = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "7_days":
          premiumExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "15_days":
          premiumExpiresAt = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "30_days":
          premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "90_days":
          premiumExpiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "180_days":
          premiumExpiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "365_days":
          premiumExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1e3).toISOString();
          break;
        case "lifetime":
          premiumExpiresAt = null;
          break;
        case "custom_date":
          if (codeData.customExpiryDate) {
            const customExpiry = new Date(codeData.customExpiryDate);
            if (customExpiry.getTime() <= now.getTime()) {
              res.status(400).json({ error: "This code's validity period has already expired." });
              return;
            }
            premiumExpiresAt = customExpiry.toISOString();
          } else {
            res.status(400).json({ error: "Invalid custom validity date configuration." });
            return;
          }
          break;
        default:
          premiumExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3).toISOString();
          break;
      }
      const redeemRecord = {
        userId,
        email,
        redeemedAt: now.toISOString()
      };
      const updatedRedeemedBy = [...codeData.redeemedBy || [], redeemRecord];
      await db2.collection("redeem_codes").doc(docId).update({
        activationCount: (codeData.activationCount || 0) + 1,
        redeemedBy: updatedRedeemedBy
      });
      await db2.collection("users").doc(userId).set({
        isPremium: true,
        premiumType: "Redeem Code",
        premiumPlan: codeData.validityType,
        premiumGrantedAt: now.toISOString(),
        premiumExpiresAt,
        redeemedCode: uppercaseCode
      }, { merge: true });
      await db2.collection("users").doc(userId).collection("premium_history").add({
        action: "Redeemed Code",
        type: "Redeem Code",
        code: uppercaseCode,
        actionDate: now.toISOString(),
        expiresAt: premiumExpiresAt,
        grantedBy: "Redeem Code System"
      });
      const planName = codeData.validityType === "lifetime" ? "Lifetime" : codeData.validityType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const friendlyExpiry = premiumExpiresAt ? new Date(premiumExpiresAt).toLocaleString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }) : "Never (Lifetime)";
      await db2.collection("users").doc(userId).collection("notifications").add({
        title: "Premium Membership Activated \u{1F389}",
        message: `Congratulations! You have successfully redeemed code "${uppercaseCode}" to activate your ${planName} Premium Membership!

Enjoy unlimited AI Voice interactions, priority study assistance, zero daily limits, and all advanced study tools.

Expiry Date: ${friendlyExpiry}`,
        createdAt: now.toISOString(),
        read: false,
        type: "premium_granted"
      });
      res.json({
        success: true,
        premiumExpiresAt,
        validityType: codeData.validityType,
        message: "Premium successfully activated!"
      });
    } catch (err) {
      console.error("Error in code redemption:", err);
      res.status(500).json({ error: "Server error during code redemption. Please try again.", details: err.message });
    }
  });
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = import_fs.default.readFileSync(import_path.default.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}
createServer();
//# sourceMappingURL=server.cjs.map
