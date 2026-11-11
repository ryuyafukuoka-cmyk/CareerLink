const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok' } });
});

app.get('/', (req, res) => {
    res.send('CareerLink backend is running');
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
