const fs = require('fs');
const axios = require('axios');

const TOKEN = 'Vx9JKdHSJB3mmpwwcTbLvZnG5TPsYh79';
const TABLE_ID = '852964';
const API_URL = 'https://api.baserow.io/api';

async function listAll() {
    try {
        let page = 1;
        let hasNext = true;
        let all = [];
        while (hasNext) {
            const response = await axios.get(`${API_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&page=${page}&size=200`, { headers: { Authorization: `Token ${TOKEN}` } });
            all = [...all, ...response.data.results];
            if (response.data.next) page++; else hasNext = false;
        }
        
        const list = all.map(r => ({id: r.id, name: r.name, ingredients: r.ingredients}));
        fs.writeFileSync('tmp/full_list.json', JSON.stringify(list, null, 2));
        console.log("Saved " + list.length + " recipes to tmp/full_list.json");
    } catch (e) {
        console.error(e.message);
    }
}
listAll();
