# 🍶 Bar Coder

> **나만의 홈바 관리 앱** — AI 바텐더와 함께하는 스마트 술장 관리 플랫폼

![Version](https://img.shields.io/badge/버전-1.0.1-gold)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![AI](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blue)

---

## 📌 프로젝트 소개

**Bar Coder**는 집에 있는 술과 재료를 체계적으로 관리하고, AI 바텐더와 대화하며 안주에 맞는 칵테일을 추천받을 수 있는 홈바 관리 웹앱입니다.

---

## ✨ 구현된 주요 기능

### 🏠 대시보드 (`/dashboard`)
- **전체 재고 현황 요약 카드**
  - **Bottles**: 보유 중인 주류(도수 있는 술) 수량 표시
  - **Ingredients**: 부재료(주스, 시럽, 과일 등) 수량 표시
  - **Low Stock**: 재고 부족 항목 수량 표시 (액체 150ml 이하, 과일류 2개 이하)
  - 각 항목 호버 시 상세 목록 툴팁 표시
- **SCAN 버튼**: 스마트 스캐너 페이지로 이동

### 📦 마이 페이지 / 술장 관리 (`/mypage`)
- **재고 조회** — 베이스 기주 / 리큐르 / 부재료 탭 분류
- **재고 추가** — 이름, 도수, 용량, 카테고리 입력 후 Baserow DB에 저장
- **재고 수정 / 삭제**
- **장보기 목록** — 필요한 재료를 장보기 목록에 추가
  - 데일리샷 / GS25 / 네이버 / 쿠팡 / 이홈바 링크 제공
- **버전 정보** — 설정(⚙️) 버튼 클릭 시 버전 정보 모달 표시 (`v1.0.1`)

### 📷 스마트 스캐너 (`/scan`)
- **카메라로 스캔**: 후면 카메라 실행 → 술병 라벨 촬영 → AI 자동 인식
- **이미지 업로드로 스캔**: 갤러리에서 사진 선택 → AI 자동 인식
- **AI 분석 결과 표시**: 술 이름 / 카테고리 / 도수(%) / 용량(ml) / 한줄 설명
- **술장에 바로 추가**: 인식된 정보를 재고에 즉시 등록
- Google Gemini Vision AI(`gemini-2.5-flash`) 기반

### 🍹 레시피 (`/recipes`)
- Baserow에 저장된 전체 레시피 조회

### 🤖 AI 바텐더 챗봇 (플로팅 버튼)
- 화면 우측 하단 `💬` 버튼으로 언제든지 접근 가능
- **2가지 검색 모드 선택**
  1. **현재 술장에 있는 재료로 검색** — 보유 주류로 만들 수 있는 칵테일 추천
  2. **모든 레시피로 검색** — 전체 레시피 DB에서 최적 칵테일 추천
- **안주 입력** → 칵테일 추천 버튼 목록 생성
- **칵테일 버튼 클릭** 시 레시피 상세 표시:
  ```
  [칵테일 이름]
  
  [제조 순서와 용량]: 각 단계 사이 줄바꿈
  
  [대체제]: 대체 재료 팁
  
  [편의점 추천]: 편의점에서 구할 수 있는 대안
  ```
- Gemini Vision AI 기반의 자연스러운 바텐더 페르소나

---

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | Next.js 15 (App Router) |
| **언어** | TypeScript |
| **스타일링** | Tailwind CSS |
| **UI 컴포넌트** | shadcn/ui, Lucide React |
| **인증** | Firebase Authentication |
| **데이터베이스** | Baserow (재고, 레시피) |
| **AI** | Google Gemini 2.5 Flash (챗봇, 스캐너) |

---

## 🚀 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정 (`.env.local`)
```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Baserow
NEXT_PUBLIC_BASEROW_URL=https://api.baserow.io/api
NEXT_PUBLIC_BASEROW_TOKEN=...
NEXT_PUBLIC_BASEROW_INVENTORY_TABLE_ID=...
NEXT_PUBLIC_BASEROW_RECIPES_TABLE_ID=...

# Google Gemini (AI 챗봇 + 스캐너)
GOOGLE_API_KEY=...
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
```

### 3. 개발 서버 실행
```bash
npm run dev
```

http://localhost:3000 에서 확인

---

## 📁 주요 파일 구조

```
src/
├── app/
│   ├── dashboard/        # 메인 대시보드 페이지
│   ├── mypage/           # 재고 관리 페이지
│   ├── recipes/          # 레시피 조회 페이지
│   ├── scan/             # 스마트 스캐너 페이지
│   └── api/
│       ├── chatbot/      # AI 바텐더 API (Gemini)
│       └── scan/         # 술병 인식 API (Gemini Vision)
├── components/
│   ├── chatbot/          # AI 챗봇 UI 컴포넌트
│   ├── dashboard/        # 대시보드 컴포넌트 (Stats, InventoryCard 등)
│   ├── layout/           # 하단 네비게이션
│   └── ui/               # 공통 UI 컴포넌트
└── lib/
    └── baserow.ts        # Baserow API 연동
```

---

## 📱 앱 정보

- **앱 이름**: Bar Coder
- **버전**: 1.0.1
- **AI 모델**: Gemini 2.5 Flash
