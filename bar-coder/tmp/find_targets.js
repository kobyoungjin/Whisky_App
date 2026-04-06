const fs = require('fs');

function findTargets() {
    let content = fs.readFileSync('tmp/recipes_list.json', 'utf8');
    // Remove BOM if present
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }
    
    try {
        const recipes = JSON.parse(content);
        const targets = recipes.filter(r => 
            r.ingredients.includes('쉐이킹') || 
            r.ingredients.includes('드라이') || 
            r.ingredients.includes('스터링') ||
            r.ingredients.includes('티스푼') || // cleanup unit if it was hardcoded as part of name? 
            r.name.includes('아마레또 사워')
        );

        console.log(JSON.stringify(targets.map(r => ({id: r.id, name: r.name, ingredients: r.ingredients, make: r.make || ""})), null, 2));
    } catch (e) {
        console.error('JSON Parse error:', e.message);
    }
}

findTargets();
