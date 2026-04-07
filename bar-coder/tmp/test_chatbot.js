const http = require('http');

const data = JSON.stringify({
    food: "삼겹살",
    uid: "dummy-uid",
    recipes: [{name: "올드 패션드"}, {name: "김렛"}, {name: "마가리타"}],
    searchMode: "all"
});

const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/chatbot',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
}, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => console.log('STATUS:', res.statusCode, '\nBODY:', raw));
});

req.on('error', (e) => console.error('ERROR:', e.message));
req.write(data);
req.end();
