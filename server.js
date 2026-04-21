import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pdf from 'pdf-parse-fork';

dotenv.config();
const app = express();
app.use(express.json({ limit: '100mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'dist')));

// ==========================================
// 1. LOCAL DATABASE
// ==========================================
const dbPath = path.join(__dirname, 'local_db.json');
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({ users: [] }, null, 2));
  console.log("📁 Local Database created at local_db.json");
}
const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// ==========================================
// 2. AUTHENTICATION ROUTES
// ==========================================
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ error: "Email already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: Date.now().toString(), email, password: hashedPassword, history: [], recommendations: [] };
    db.users.push(newUser);
    writeDB(db);
    res.json({ message: "User created!" });
  } catch (err) { res.status(500).json({ error: "Signup failed." }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret123');
    res.json({ token, userId: user.id, email: user.email, recommendations: user.recommendations });
  } catch (err) { res.status(500).json({ error: "Login failed." }); }
});

// ==========================================
// 3. GROQ AI ROUTE (QUIZ & PODCAST)
// ==========================================
app.post('/api/ai', async (req, res) => {
  try {
    const { prompt, fileData, userId, filename, language } = req.body;

    const buffer = Buffer.from(fileData, 'base64');
    const pdfData = await pdf(buffer);
    const truncatedText = pdfData.text.split(/\s+/).slice(0, 3000).join(" ");

    const isHindi = language === 'Hindi';
    console.log(`🌐 Language requested: ${language}, isHindi: ${isHindi}`);

    // FIX 1 & 2: Stronger system prompt that explicitly acknowledges the English
    // source document so the model doesn't use that as an excuse to respond in English.
    // Also grants explicit permission to use the NEXT_STEPS marker in English.
    const systemPrompt = isHindi
      ? `You are an expert educational AI assistant. You have one absolute, unbreakable rule:

OUTPUT LANGUAGE: Hindi (Devanagari script) ONLY.

- Write EVERY word in Devanagari script: words, sentences, explanations, options, everything.
- The source document will be in English. That is expected. Your JOB is to process that English document and respond entirely in Hindi — think of it as translation + teaching.
- NEVER write English words in your response body. Not even one.
- NEVER write Hinglish (romanized Hindi). Wrong: "Yeh ek test hai". Right: "यह एक परीक्षण है".
- If generating JSON: JSON structural keys (like "question_text", "options", "correct_answer", "explanation", "front", "back", "quiz_title") must stay in English. Every VALUE must be in Devanagari Hindi.
- The special system marker NEXT_STEPS must be written in English exactly as shown — this is a backend parsing marker, not content, so it is exempt from the Hindi rule.

This language rule is absolute and overrides all other instructions.`
      : `You are an expert educational AI assistant. Write all responses in clear, professional English.`;

    // FIX 1: NEXT_STEPS instruction is now split by language.
    // Previously the Hindi system prompt said "every word must be Hindi" but the
    // user prompt simultaneously demanded the English keyword NEXT_STEPS — the model
    // would panic at the contradiction and fall back to English for the whole response.
    const nextStepsRule = isHindi
      ? `\n\nSPECIAL INSTRUCTION: After your complete Hindi response, append the literal English keyword NEXT_STEPS (this English keyword is required and exempt from the Hindi rule — it is a backend system marker). Then list 3 related study topics in Hindi separated by commas. Example: NEXT_STEPS विषय एक, विषय दो, विषय तीन`
      : `\n\nBACKEND RULE: At the very end of your response, add the exact word NEXT_STEPS followed by 3 related sub-topics to study next, separated by commas.`;

    const userPrompt = `DOCUMENT TEXT:\n${truncatedText}\n\nUSER TASK:\n${prompt}${nextStepsRule}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API Error");

    const fullText = data.choices[0].message.content;
    const parts = fullText.split('NEXT_STEPS');
    const cleanText = parts[0].trim();
    const recs = parts[1] ? parts[1].replace(/[:\n]/g, '').split(',') : [];
    const cleanRecs = recs.map(r => r.trim()).filter(r => r);

    if (userId) {
      try {
        const db = readDB();
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          db.users[userIndex].history.push({
            id: Date.now().toString(),
            topic: cleanRecs[0] || "General Study",
            filename: filename || "document.pdf",
            date: new Date().toLocaleDateString()
          });
          db.users[userIndex].recommendations = cleanRecs;
          writeDB(db);
          console.log(`✅ History saved for user ${userId}`);
        } else {
          console.warn(`⚠️ User not found in DB for userId: ${userId}`);
        }
      } catch (dbErr) {
        console.error("DB write error (non-fatal):", dbErr);
      }
    }

    res.json({ text: cleanText, recommendations: cleanRecs });
  } catch (error) {
    console.error("🔥 REAL BACKEND ERROR:", error);
    res.status(500).json({ error: "AI processing failed." });
  }
});

// ==========================================
// 4. GROQ AI ROUTE (FLASHCARDS)
// ==========================================
app.post('/api/ai/flashcards', async (req, res) => {
  try {
    const { fileData, language } = req.body;
    const buffer = Buffer.from(fileData, 'base64');
    const pdfData = await pdf(buffer);
    const truncatedText = pdfData.text.split(/\s+/).slice(0, 3000).join(" ");

    const isHindi = language === 'Hindi';

    // FIX 3: Added a system prompt to the flashcards route — it previously had none,
    // making Hindi enforcement much weaker (only a user-turn instruction, which the
    // model treats as lower priority than a system instruction).
    const flashcardSystemPrompt = isHindi
      ? `You are an educational AI. Every word you write must be in Hindi (Devanagari script). The source text is in English — process it and respond fully in Hindi. JSON keys stay in English; all values in Devanagari Hindi. Do not use English or Hinglish in your output.`
      : `You are an educational AI. Write all content in clear, professional English.`;

    const langInstruction = isHindi
      ? `LANGUAGE: All "front" and "back" values must be in Hindi Devanagari script. JSON keys stay in English.`
      : `LANGUAGE: Write all flashcard content in English.`;

    const groqPrompt = `Extract 10 key concepts from this text.
CRITICAL RULE: The 'front' of the flashcard MUST be a fully descriptive phrase of 4 to 8 words. Do NOT use just 1 or 2 words.
The 'back' must be a clear 1-2 sentence definition.
${langInstruction}
Return ONLY a raw JSON array with no markdown or preamble:
[{"front": "Descriptive phrase here", "back": "Definition of the concept"}]
TEXT: ${truncatedText}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: flashcardSystemPrompt },
          { role: "user", content: groqPrompt }
        ],
        temperature: 0.2
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq API Error");
    res.json({ text: data.choices[0].message.content });
  } catch (error) {
    console.error("🔥 FLASHCARD ERROR:", error);
    res.status(500).json({ error: "Flashcard processing failed." });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT} with REAL Groq AI`));
