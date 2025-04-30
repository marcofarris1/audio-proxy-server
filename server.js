const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Audio Proxy Server is running!');
});

// Main download endpoint with better header handling
app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Download request received for URL:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`Attempting to download: ${url}`);
    
    // Enhanced headers that mimic a real browser better
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'sec-ch-ua': '"Google Chrome";v="91", "Chromium";v="91", ";Not A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site'
    };
    
    console.log('Sending request with enhanced headers');
    
    // Download the file with improved error handling
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: headers,
      maxRedirects: 5,
      timeout: 30000,
      validateStatus: function (status) {
        return status < 500; // Accept any status code less than 500
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.status !== 200) {
      return res.status(response.status).json({
        error: `Download failed with status code ${response.status}`,
        message: "The source server rejected the request or the file doesn't exist"
      });
    }
    
    // Set appropriate headers
    console.log('Sending audio data to client');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
    
    // Send the audio data
    res.send(Buffer.from(response.data));
    
  } catch (error) {
    console.error('Download error:', error.message);
    res.status(500).json({ 
      error: 'Failed to download audio file',
      message: error.message
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});