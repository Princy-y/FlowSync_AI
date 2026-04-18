const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Health check for Cloud Run
app.get('/health', (req, res) => res.status(200).send('OK'));

// Serve the built React frontend from the dist folder
// In the Docker image, dist/ is copied alongside server.js at /app/dist
app.use(express.static(path.join(__dirname, 'dist')));

// Send all other requests to the React app (client-side routing)
// Note: Express 5 requires a named wildcard parameter instead of bare '*'
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Cloud Run assigns the PORT env variable
app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowSync AI server running on port ${PORT}`);
});