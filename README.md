# 🍸 Midnight Mixologist
> **The Ultimate AI-Powered Cocktail Curator & Inventory Manager**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-blue?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![Baserow](https://img.shields.io/badge/CMS-Baserow-green?style=for-the-badge&logo=baserow)](https://baserow.io/)

**Midnight Mixologist**는 AI와 현대적 디자인이 조화를 이루는 고품격 칵테일 큐레이터입니다. 당신의 홈 바(Home Bar) 재고를 스마트하게 관리하고, 분위기와 안주에 딱 맞는 칵테일 레시피를 AI가 제안합니다.

---

## ✨ Key Features

### 💎 Smart Dashboard (Bento Grid)
- **Ready to Mix**: 현재 내 인벤토리의 재료로 즉시 제조 가능한 칵테일 실시간 추천.
- **Almost Perfect**: 재료 하나가 부족한 '거의 완성된' 레시피와 스마트한 대체 재료(Substitutes) 제안.
- **Unified Navigation**: 스티키 탑바와 모바일 퍼스트 레이아웃으로 쾌적한 탐색 환경.

### 🤖 Midnight Mixologist (AI Chatbot)
- **Context-Aware Recommendations**: 내 재고 상황을 이해하고 최적의 레시피를 제안하는 똑똑한 바텐더.
- **Twin Modes**:
  - 🍢 **Food Pairing**: 선택한 칵테일과 가장 어울리는 편의점/일반 안주 조합 추천.
  - 🍸 **Cocktail Pairing**: 먹고 싶은 음식에 가장 어울리는 칵테일 역추천.

### 📖 Advanced Recipe Manager
- **Direct Submission**: 커뮤니티 성장을 위해 사용자가 직접 새로운 레시피를 서버에 등록.
- **Smart Media Integration**: 
  - **Upload or Paste (Ctrl+V)**: 로컬 파일 업로드는 물론, 웹 서핑 중 복사한 이미지를 즉시 붙여넣기로 등록 가능.
- **Structured Metadata**: 가니쉬, 베이스 스피릿 등 세밀한 정보를 JSON 형식으로 구조화하여 데이터 정합성 보장.
- **Duplicate Protection**: 중복된 이름의 레시피 등록 방지 및 데이터 무결성 검사.

### 🎒 Inventory Tracking
- **Scan & Manage**: 내가 가진 술과 재료를 검색하고 실시간으로 인벤토리에 추가/삭제.
- **Shopping List**: 부족한 재료를 관리하고 장바구니로 연동 (준비 중).

---

## 🛠️ Tech Stack

- **Framework**: `Next.js 15 (App Router)`
- **Styling**: `Tailwind CSS`, `Custom Glassmorphism Design System`
- **AI Engine**: `Google Gemini 1.5 Pro` (Prompt Engineering & Recommendation)
- **Backend/CMS**: `Baserow` (Headless Database)
- **Authentication**: `Firebase Auth`
- **Icons**: `Lucide React`, `Google Material Symbols`

---

## 🚀 Getting Started

### 1. Environment Variables
`.env.local` 파일에 다음 설정이 필요합니다:
```env
NEXT_PUBLIC_BASEROW_URL=https://api.baserow.io/api
NEXT_PUBLIC_BASEROW_TOKEN=your_token
NEXT_PUBLIC_BASEROW_RECIPES_TABLE_ID=your_id
GOOGLE_API_KEY=your_gemini_key
```

### 2. Installation
```bash
npm install
npm run dev
```

---

## 📸 Screenshots & Walkthrough
최신 업데이트 내역과 UI 시연은 프로젝트 내부의 `walkthrough.md` 파일을 참조하세요.

---
*Created with ❤️ by the Midnight Mixologist Team*
