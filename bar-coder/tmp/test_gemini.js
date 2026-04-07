const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
const apiKey = envContent.match(/GOOGLE_API_KEY=(.+)/)[1].trim();
const model = 'gemini-2.0-flash';
const query = '러셀 리저브 싱글배럴';
const validCategories = '위스키, 버번, 진, 보드카, 럼, 데킬라, 브랜디, 꼬냑, 와인, 리큐르, 비터, 전통주, 과일, 주스, 시럽, 가루, 음료, 소다, 기타';
const prompt = `당신은 세계의 모든 주류와 바 재료에 대해 박식한 전문 바텐더입니다.
사용자가 검색한 "${query}"에 대한 정확한 Specs를 아래 JSON 형식으로만 반환하세요.

{"name":"알려진 정식 명칭(한글과 영문 병기)","category":"아래 목록 중 하나","abv":숫자,"volume":숫자}

category는 반드시 다음 중 하나여야 합니다: ${validCategories}
abv: 해당 제품의 정확한 공식 알코올 도수(%)
volume: 해당 제품의 표준 판매 용량(ml)

찾을 수 없으면: {"name":"${query}","category":"기타","abv":0,"volume":200}`;

fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
    })
})
.then(r => r.json())
.then(d => {
    const raw = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('RAW Gemini response:', raw);
    try {
        const jsonStr = raw.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        console.log('Parsed:', JSON.stringify(parsed, null, 2));
    } catch(e) {
        console.log('Parse error:', e.message);
    }
})
.catch(e => console.error('Fetch error:', e.message));
