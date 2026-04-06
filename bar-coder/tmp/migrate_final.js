const axios = require('axios');

const TOKEN = 'Vx9JKdHSJB3mmpwwcTbLvZnG5TPsYh79';
const TABLE_ID = '852964';
const API_URL = 'https://api.baserow.io/api';

async function migrate() {
    try {
        console.log("Fetching all recipes...");
        let allRecipes = [];
        let page = 1;
        let hasNext = true;

        while (hasNext) {
            const response = await axios.get(
                `${API_URL}/database/rows/table/${TABLE_ID}/?user_field_names=true&page=${page}&size=200`,
                { headers: { Authorization: `Token ${TOKEN}` } }
            );
            allRecipes = [...allRecipes, ...response.data.results];
            if (response.data.next) {
                page++;
            } else {
                hasNext = false;
            }
        }

        console.log(`Analyzing ${allRecipes.length} recipes...`);

        for (const recipe of allRecipes) {
            let needsUpdate = false;
            let ing = recipe.ingredients || "";
            let make = recipe.make || "";

            // Pattern 1: "...를 드라이 쉐이킹 후 ..."
            if (ing.includes("드라이 쉐이킹") || ing.includes("드라이쉐이킹")) {
                const match = ing.match(/(.*?)(\d+ml)?\s*를?\s*드라이\s*쉐이킹\s*후\s*(.*)/);
                if (match) {
                    const ing1 = match[1].trim() + (match[2] ? " " + match[2] : "");
                    const ing2 = match[3].trim();
                    ing = `${ing1}, ${ing2}`;
                    if (!make.includes("드라이쉐이킹")) {
                        make = `1. 드라이쉐이킹 후 쉐이킹\n${make}`;
                    }
                    needsUpdate = true;
                }
            }

            // Pattern 2: "...를 쉐이킹"
            if (ing.includes("를 쉐이킹")) {
                ing = ing.replace(/를 쉐이킹/g, "").replace(/\s+/g, " ").trim();
                if (!make.includes("쉐이킹")) {
                    make = `1. 쉐이킹\n${make}`;
                }
                needsUpdate = true;
            }
            
            // Pattern 3: trailing ", 드라이쉐이킹 후 쉐이킹" (like Amaretto Sour case)
            if (ing.includes("드라이쉐이킹 후 쉐이킹")) {
                ing = ing.replace(/,?\s*드라이쉐이킹 후 쉐이킹/g, "").replace(/^,|,$/g, "").trim();
                needsUpdate = true;
            }

            if (needsUpdate) {
                console.log(`Updating ${recipe.id} (${recipe.name}):`);
                console.log(`  Ingredients: ${recipe.ingredients} -> ${ing}`);
                
                await axios.patch(
                    `${API_URL}/database/rows/table/${TABLE_ID}/${recipe.id}/?user_field_names=true`,
                    { ingredients: ing, make: make },
                    { headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' } }
                );
                console.log(`  Done.`);
            }
        }

        console.log("Migration finished.");
    } catch (e) {
        console.error('Error:', e.response ? e.response.data : e.message);
    }
}

migrate();
