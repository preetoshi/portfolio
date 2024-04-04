const express = require('express');
const app = express();
const port = process.env.PORT || 2000;

app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to my chatbot API!' });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    
});