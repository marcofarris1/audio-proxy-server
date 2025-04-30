const express = require('express');
const axios = require('axios');
const cors = require('cors');
const ytdl = require('ytdl-core');
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Audio Proxy Server is running!');
});

// Handle both regular audio and YouTube URLs
app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('Download request received for URL:', url);
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // If it's a YouTube URL, handle differently
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      console.log('Processing YouTube URL:', url);
      
      // Validate the URL
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }
      
      try {
        // Get info to check if video exists and is accessible
        const info = await ytdl.getInfo(url);
        const videoTitle = info.videoDetails.title;
        console.log(`Video title: ${videoTitle}`);

        // Get audio only format
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        if (audioFormats.length === 0) {
          return res.status(400).json({ error: 'No audio format available' });
        }

        // Set response headers
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${videoTitle.replace(/[^\w\s]/gi, '')}.mp3"`);
        
        // Stream the audio directly to the response
        ytdl(url, {
          quality: 'highestaudio',
          filter: 'audioonly',
        }).pipe(res);
        
        return;
      } catch (ytError) {
        console.error('YouTube error:', ytError);
        return res.status(500).json({ 
          error: 'Failed to process YouTube video', 
          message: ytError.message 
        });
      }
    } 
    
    // For non-YouTube URLs
    try {
      console.log(`Attempting to download: ${url}`);
      
      // Browser-like headers
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      };
      
      // Download the file
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
        headers: headers,
        maxRedirects: 5
      });
      
      // Set appropriate headers and send response
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Disposition', 'attachment; filename="audio.mp3"');
      res.send(Buffer.from(response.data));
      
    } catch (error) {
      console.error('Download error:', error.message);
      res.status(500).json({ 
        error: 'Failed to download audio file',
        message: error.message
      });
    }
  } catch (generalError) {
    console.error('General error:', generalError);
    res.status(500).json({ error: 'Server error', message: generalError.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});