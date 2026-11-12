// Local development entry point. The Lambda handler will be a separate file.
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok' } });
});

app.listen(PORT, () => {
    console.log(`CareerLink backend listening on http://localhost:${PORT}`);
});
