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
            console.log(`  Page ${page}...`);
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

        console.log(`Total recipes fetched: ${allRecipes.length}`);

        for (const recipe of allRecipes) {
            let needsUpdate = false;
            let newIngredients = recipe.ingredients;
            let newMake = recipe.make || "";

            // Normalize strings to be safe
            const ingredients = recipe.ingredients || "";

            // 1. "드라이쉐이킹 후 쉐이킹" cleanup
            if (ingredients.includes("드라이쉐이킹 후 쉐이킹")) {
                newIngredients = ingredients.replace(/,?\s*드라이쉐이킹 후 쉐이킹\s*,?/g, ",").replace(/^,|,$/g, "").trim();
                newIngredients = newIngredients.replace(/,\s*,/g, ", ").trim();
                if (!newMake.includes("드라이쉐이킹")) {
                    newMake = `드라이쉐이킹 후 쉐이킹\n${newMake}`;
                }
                needsUpdate = true;
            }

            // 2. "를 드라이 쉐이킹 후" cleanup
            if (ingredients.includes("를 드라이 쉐이킹 후")) {
                const match = ingredients.match(/(.+)를 드라이 쉐이킹 후 (.+)/);
                if (match) {
                    newIngredients = `${match[1]}, ${match[2]}`;
                    if (!newMake.includes("드라이 쉐이킹")) {
                        newMake = `드라이 쉐이킹 후 쉐이킹\n${newMake}`;
                    }
                    needsUpdate = true;
                }
            }
            
            // 3. "를 쉐이킹" cleanup (e.g. "애프리콧 브랜디 45ml를 쉐이킹")
            if (ingredients.includes("를 쉐이킹")) {
                newIngredients = ingredients.replace(/를 쉐이킹/g, "").trim();
                needsUpdate = true;
            }

            // 4. "심플시럽 2티스푼" unit normalization (if needed in DB)
            // The user's image shows "심플시럽 2티스푼" (IN BAR). 
            // If they want it normalized in DB too:
            // But let's stick to the most critical prep-method-in-ingredients issue first.

            if (needsUpdate) {
                console.log(`\n[UPDATE] ID: ${recipe.id} | Name: ${recipe.name}`);
                console.log(`  From: "${recipe.ingredients}"`);
                console.log(`  To:   "${newIngredients}"`);
                
                await axios.patch(
                    `${API_URL}/database/rows/table/${TABLE_ID}/${recipe.id}/?user_field_names=true`,
                    { ingredients: newIngredients, make: newMake },
                    { headers: { Authorization: `Token ${TOKEN}`, 'Content-Type': 'application/json' } }
                );
                console.log(`  Status: SUCCESS`);
            }
        }
        console.log("\nMigration completed.");
    } catch (e) {
        console.error('Migration error:', e.response ? e.response.data : e.message);
    }
}

migrate();
