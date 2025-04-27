const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000; // Changed from 4000 to 5000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Audio Proxy Server is running!');
});

// Test HTML endpoint
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/test.html');
});

// Proxy endpoint to download audio files
app.post('/download', async (req, res) => {
  try {
    // Get the URL from the request body
    const { url } = req.body;
    
    console.log('Download request received for URL:', url);
    
    if (!url) {
      console.log('Error: No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }
    
    console.log(`Attempting to download: ${url}`);
    
    // Set headers that mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.youtube.com/'
    };
    
    console.log('Sending request with headers:', headers);
    
    // Download the file with the browser-like headers
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer',
      headers: headers,
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });
    
    console.log('Response received:');
    console.log('- Status:', response.status);
    console.log('- Content-Type:', response.headers['content-type']);
    console.log('- Data length:', response.data.length);
    
    // Check if we got actual audio data
    const contentType = response.headers['content-type'];
    const isAudio = contentType && (
      contentType.includes('audio') || 
      contentType.includes('octet-stream') ||
      url.toLowerCase().endsWith('.mp3')
    );
    
    if (!isAudio && response.status !== 200) {
      console.log('Not audio data, responding with error');
      return res.status(400).json({ 
        error: 'The server did not return audio data',
        contentType: contentType,
        status: response.status
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
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/test.html');
});