BISense

AI Assistant for Indian Standards & BIS Services

BISense is a Smart India Hackathon 2026 prototype that helps users discover, understand and work with Indian Standards and BIS-related information through an AI-assisted web platform.

Goal: Make the BIS journey easier by connecting standards discovery, AI assistance, product analysis, certification guidance, compliance workflows and laboratory discovery in one interface.

✨ Features

Feature

What it does

🔎 Standards Search

Search Indian Standards by number, title, category, status and edition

🤖 BIS AI Copilot

Ask natural-language questions about BIS and Indian Standards

🏭 Certification Advisor

Explore potentially relevant standards and certification considerations

📷 Product Analyzer

Analyze a product image with Gemini and find potential BIS matches

✅ Compliance Assistant

Build a trackable checklist from available standard information

⚖️ Compare Standards

Compare two standards side by side

🧪 Laboratory Finder

Search BIS LIMS laboratories by IS number

👤 Dashboard & Profile

Authentication, profile and recent activity

🧠 AI & Data

Google Gemini for AI-assisted responses and product-image analysis

SQLite + SQLAlchemy for the BISense knowledge base

BIS LIMS integration for laboratory search

PDF extraction and document-retrieval infrastructure

Supabase Auth for user accounts

🛠 Tech Stack

Frontend

React

Vite

React Router

CSS

Supabase

Backend

Python

FastAPI

Uvicorn

SQLAlchemy

SQLite

BeautifulSoup

Requests

pypdf

Google GenAI SDK

🏗 Architecture

User
  ↓
React / Vite Frontend
  ↓
FastAPI Backend
  ├── Standards
  ├── BIS AI
  ├── Product Analysis
  ├── Compliance
  ├── Comparison
  └── Laboratory Search
       ↓
BISense SQLite Knowledge Base
       ↓
Official BIS / BIS LIMS sources

🚀 Local Setup

Backend

cd /d "C:\Users\shiva\OneDrive\Desktop\SIH 2026\BACKEND"
venv\Scripts\activate
uvicorn app.main:app --reload

API: http://127.0.0.1:8000

Swagger: http://127.0.0.1:8000/docs

Frontend

cd /d "C:\Users\shiva\OneDrive\Desktop\SIH 2026\FRONTEND"
npm run dev

Web app: http://localhost:5173

🔐 Environment Variables

Backend expects:

GEMINI_API_KEY=your_gemini_api_key

Supabase configuration is stored in the frontend .env.local.

Secrets and local files are excluded through .gitignore.

🌐 Official Sources

Bureau of Indian Standards

BIS Standards Portal

BIS LIMS

📌 Project Status

Core prototype workflows are implemented for standards search, AI assistance, product analysis, certification guidance, compliance, comparison, laboratory discovery, authentication, dashboard and profile.

Advanced embedding-based retrieval infrastructure is implemented but should be validated with authorized BIS documents before being described as fully production-validated RAG.

⚠️ Disclaimer

BISense provides AI-assisted information discovery and workflow support. It does not make official BIS certification, legal or compliance decisions. Important requirements should always be verified against the latest official BIS and government sources.

🇮🇳 Smart India Hackathon 2026

Problem Statement: SIH26107 — AI Assistant for Indian Standards and BIS Services

Built as a Smart India Hackathon 2026 prototype.