EduStream AI is a production-ready, full-stack educational platform designed to transform static PDF documents into interactive learning experiences. Developed by Anoushka Rufus during an AI Internship at Trigyn Technologies, the platform leverages Large Language Models (LLMs) to generate real-time study aids.

🚀 Core Features
Multilingual AI Generation: Seamlessly switches between English and Hindi (Devanagari script) for all generated content.

AI Quiz Generator: Dynamically creates quizzes with customizable lengths based on uploaded PDF content, featuring instant grading and explanations.

AI Podcast Synthesizer: Generates conversational summaries using Text-to-Speech (TTS) with a unique timestamped note-taking system for interactive audio navigation.

Smart Flashcards: Extracts key concepts into descriptive phrase-based flashcards using 3D CSS animations.

Study Dashboard: Tracks user history and provides AI-driven "Next Step" recommendations to guide the learning journey.

Secure Authentication: Features a full user lifecycle (Signup/Login) with JWT token management and bcrypt password hashing.

🛠️ Technical Stack
Frontend
Framework: React 18 with TypeScript

Styling: Tailwind CSS

Icons: Lucide React

State Management: React Context API

Backend
Runtime: Node.js & Express

AI Engine: Groq API (Llama 3.3 70B & Llama 3.1 8B models)

Database: Local JSON-based storage for user history and credentials

Document Processing: pdf-parse-fork for server-side data extraction

🔧 Installation & Setup
Clone the repository:

Bash
git clone https://github.com/anoushka-rufus-1808/EduStream.git
cd EduStream
Install dependencies:

Bash
npm install
Configure Environment Variables:
Create a .env file in the root directory:

Code snippet
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_jwt_secret
Build and Start:

Bash
npm run build
npm start
🧠 Engineering Challenges Overcome
Language Inertia: Solved "language bleed" where English documents biased AI output by implementing strict System Prompt Overrides on the backend.

TTS Sanitization: Developed a multi-layered Regex engine to strip markdown and non-verbal symbols, preventing Windows TTS from reading random ASCII number codes.

JSON Integrity: Enforced strict schema adherence to ensure the LLM maintained English structural keys while delivering Hindi values for Devanagari support.
