const fs = require('fs');

function findRecipes() {
    try {
        const raw = fs.readFileSync('tmp/recipes_list.json', 'utf8');
        const clean = raw.replace(/^\uFEFF/, '').replace(/[\x00-\x1F\x7F-\x9F]/g, " "); // Strip control chars
        const recipes = JSON.parse(clean);
        
        const targets = recipes.filter(r => r.name && (r.name.includes('커피') || r.ingredients.includes('포트와인')));
        console.log(JSON.stringify(targets.map(r => ({id: r.id, name: r.name, ingredients: r.ingredients})), null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

findRecipes();
