const express = require('express');
const axios = require('axios');
const cors = require('cors');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 5000;

// Create a temporary directory for downloads
const tempDir = path.join(__dirname, 'temp');
fs.ensureDirSync(tempDir);

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
    
    // Check if it's a YouTube URL
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return handleYouTubeDownload(url, res);
    }
    
    console.log(`Attempting to download regular audio: ${url}`);
    
    // Set headers that mimic a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/'
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

// Dedicated YouTube download endpoint
app.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    return handleYouTubeDownload(url, res);
    
  } catch (error) {
    console.error('YouTube download error:', error.message);
    res.status(500).json({ 
      error: 'Failed to download YouTube audio',
      message: error.message
    });
  }
});

// Function to handle YouTube downloads
async function handleYouTubeDownload(url, res) {
  try {
    console.log(`Processing YouTube URL: ${url}`);
    
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      console.log('Invalid YouTube URL');
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Get video info
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '');
    console.log(`Video title: ${videoTitle}`);
    
    // Create unique filename
    const fileName = `${videoTitle}-${Date.now()}.mp3`;
    const filePath = path.join(tempDir, fileName);
    
    console.log(`Downloading to: ${filePath}`);
    
    // Get audio only format
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    
    if (!audioFormat) {
      console.log('No audio format found');
      return res.status(400).json({ error: 'No audio format available for this video' });
    }
    
    // Download stream
    const videoStream = ytdl(url, { format: audioFormat });
    
    // Convert to MP3 using ffmpeg
    const ffmpegProcess = ffmpeg(videoStream)
      .audioBitrate(192)
      .format('mp3')
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        return res.status(500).json({ error: 'Error processing audio', message: err.message });
      })
      .on('end', () => {
        console.log('Download completed');
        
        // Send file to user
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        
        // Stream file to response and delete afterwards
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
        // Clean up file after sending
        fileStream.on('end', () => {
          fs.remove(filePath).catch(err => console.error('Error removing temp file:', err));
        });
      })
      .save(filePath);
      
  } catch (error) {
    console.error('YouTube processing error:', error.message);
    res.status(500).json({ 
      error: 'Failed to process YouTube video',
      message: error.message
    });
  }
}

// Clean the temp directory on startup
fs.emptyDirSync(tempDir);

// Start the server
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});