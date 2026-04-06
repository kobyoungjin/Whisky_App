const axios = require('axios');

const TOKEN = 'Vx9JKdHSJB3mmpwwcTbLvZnG5TPsYh79';
const TABLE_ID = '852964';
const API_URL = 'https://api.baserow.io/api';

async function fetchAllRecipes() {
    try {
        let allResults = [];
        let page = 1;
        let hasNextPage = true;

        while (hasNextPage) {
            const response = await axios.get(
                `${API_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&page=${page}&size=200`,
                {
                    headers: {
                        Authorization: `Token ${TOKEN}`,
                        'Content-Type': 'application/json',
                    }
                }
            );
            allResults = [...allResults, ...response.data.results];

            if (response.data.next) {
                page += 1;
            } else {
                hasNextPage = false;
            }
        }

        console.log(JSON.stringify(allResults, null, 2));
    } catch (error) {
        console.error('Error fetching recipes:', error.response ? error.response.data : error.message);
    }
}

fetchAllRecipes();
