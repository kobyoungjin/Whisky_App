const axios = require('axios');

const TOKEN = 'Vx9JKdHSJB3mmpwwcTbLvZnG5TPsYh79';
const TABLE_ID = '852964';
const API_URL = 'https://api.baserow.io/api';

async function targetedUpdate() {
    try {
        const id_303 = {
            id: 303,
            name: "조세핀 베이커",
            ingredients: "심플시럽 2티스푼, 계란 1개, 포트와인 45ml, 꼬냑 or 브랜디 45ml, 애프리콧 브랜디 45ml",
            make: "1. 포트와인을 먼저 드라이 쉐이킹 합니다. 2. 나머지 재료(심플시럽, 계란, 꼬냑, 애프리콧 브랜디)를 넣고 쉐이킹 합니다. 3. 차가운 칵테일 글라스에 걸러준 뒤 서빙합니다."
        };

        const id_226 = {
            id: 226,
            name: "아마레또 사워",
            ingredients: "아마레또 45ml, 버번 위스키 22.5ml, 레몬즙 30ml, 계란 흰자 1개, 심플시럽 1티스푼",
            make: "1. 모든 재료를 쉐이커에 넣습니다. 2. 얼음 없이 드라이 쉐이킹 합니다. 3. 얼음을 넣고 다시 한번 강력하게 쉐이킹 합니다. 4. 얼음을 채운 올드 패션드 글라스에 따릅니다. 5. 레몬 휠과 체리로 장식합니다."
        };

        const targets = [id_303, id_226];

        for (const target of targets) {
            console.log(`Updating ${target.id} (${target.name})...`);
            await axios.patch(
                `${API_URL}/database/rows/table/${TABLE_ID}/${target.id}/?user_field_names=true`,
                { ingredients: target.ingredients, make: target.make },
                { headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' } }
            );
            console.log(`  Done.`);
        }
        console.log("Targeted migration finished.");
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

targetedUpdate();
