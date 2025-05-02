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

// Main download endpoint
app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Download request received for URL:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`Attempting to download: ${url}`);
    
    // Special headers to get around restrictions
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'Range': 'bytes=0-'
    };
    
    // THIS IS CRITICAL - Always respond with binary data, never with JSON errors!
    try {
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        headers: headers,
        timeout: 30000,
        maxRedirects: 5
      });
      
      // Critical part: Set content type to audio/mpeg regardless of response
      console.log('Response received, sending as audio...');
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
      res.send(Buffer.from(response.data));
      
    } catch (error) {
      // If we can't get the file, respond with a dummy MP3 
      // This ensures n8n always gets binary data even on errors
      console.error(`Error downloading from ${url}: ${error.message}`);
      
      // Create a minimal empty MP3 file (empty but valid mp3)
      const emptyMp3 = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'binary');
      
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="empty.mp3"');
      res.send(emptyMp3);
    }
  } catch (generalError) {
    console.error('General error:', generalError);
    
    // Still send an MP3 even on total failure
    const emptyMp3 = Buffer.from('ID3\x03\x00\x00\x00\x00\x00\x00', 'binary');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(emptyMp3);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});