const axios = require('axios');
const fs = require('fs');

// URL to a reliable sample MP3
const audioUrl = 'https://filesamples.com/samples/audio/mp3/sample3.mp3';

// Test direct download with axios
async function testDirectDownload() {
  try {
    console.log('Testing direct download...');
    const response = await axios({
      method: 'get',
      url: audioUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log('Direct download successful!');
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Data length:', response.data.length);
    
    // Save to a file to verify it's a valid MP3
    fs.writeFileSync('test-direct.mp3', Buffer.from(response.data));
    console.log('Saved to test-direct.mp3');
  } catch (error) {
    console.error('Direct download failed:', error.message);
  }
}

// Run the test
testDirectDownload();