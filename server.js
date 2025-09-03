const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.text({ type: 'text/xml' }));

// Proxy endpoint for Tally communication
app.post('/tally-proxy', async (req, res) => {
  try {
    console.log('Received request to proxy to Tally');
    console.log('Request body:', req.body);
    
    // Forward the request to Tally
    const tallyResponse = await axios.post('http://localhost:9000/', req.body, {
      headers: {
        'Content-Type': 'text/xml',
      },
      timeout: 10000, // 10 second timeout
    });
    
    console.log('Tally response status:', tallyResponse.status);
    console.log('Tally response data:', tallyResponse.data);
    
    // Send the response back to the client
    res.set('Content-Type', 'text/xml');
    res.send(tallyResponse.data);
    
  } catch (error) {
    console.error('Error proxying to Tally:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Tally connection refused. Please ensure Tally is running at localhost:9000' 
      });
    } else if (error.code === 'ETIMEDOUT') {
      res.status(504).json({ 
        error: 'Tally request timed out. Please check if Tally is responding.' 
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to communicate with Tally: ' + error.message 
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tally proxy server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Tally proxy server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying requests to Tally at http://localhost:9000`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Proxy endpoint: http://localhost:${PORT}/tally-proxy`);
});
