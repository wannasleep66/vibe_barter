const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Change this if your server runs on a different port
const TEST_FILE_PATH = path.join(__dirname, 'test-image.jpg');
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // You'll need to set this to a valid JWT token

// Create a dummy test image file if it doesn't exist
function createTestFile() {
  if (!fs.existsSync(TEST_FILE_PATH)) {
    // Create a small dummy image file
    const imageBuffer = Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000A49444154789C63000100000500010D0A2DB4010000000049454E44AE426082', 'hex');
    fs.writeFileSync(TEST_FILE_PATH, imageBuffer);
    console.log('Created test image file');
  }
}

async function testFileUpload() {
  console.log('Starting file upload test...');
  
  try {
    // Create form data
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE_PATH));
    
    // Set up headers
    const headers = {
      ...form.getHeaders(),
      'Authorization': `Bearer ${AUTH_TOKEN}`
    };
    
    // Make request
    const response = await axios.post(`${BASE_URL}/api/files/upload`, form, {
      headers: headers
    });
    
    console.log('Upload response:', response.data);
    
    if (response.data.success) {
      console.log('File upload test passed!');
      return response.data.data;
    } else {
      console.log('File upload test failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('Error during file upload test:', error.response?.data || error.message);
    return null;
  }
}

async function testFileDownload(filename) {
  console.log('Starting file download test...');
  
  try {
    const response = await axios.get(`${BASE_URL}/uploads/${filename}`, {
      responseType: 'stream'
    });
    
    if (response.status === 200) {
      console.log('File download test passed!');
      return true;
    } else {
      console.log('File download test failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error during file download test:', error.message);
    return false;
  }
}

async function testFileDelete(filename) {
  console.log('Starting file delete test...');
  
  try {
    const response = await axios.delete(`${BASE_URL}/api/files/${filename}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
    
    if (response.data.success) {
      console.log('File delete test passed!');
      return true;
    } else {
      console.log('File delete test failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('Error during file delete test:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  if (!AUTH_TOKEN) {
    console.log('Warning: No AUTH_TOKEN provided. Some tests may fail without authentication.');
  }
  
  // Create test file if needed
  createTestFile();
  
  // Test upload
  const uploadResult = await testFileUpload();
  if (!uploadResult) {
    console.log('Upload test failed, stopping tests.');
    return;
  }
  
  // Test download
  const downloadResult = await testFileDownload(uploadResult.filename);
  
  // Test delete
  const deleteResult = await testFileDelete(uploadResult.filename);
  
  console.log('All tests completed.');
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  testFileUpload,
  testFileDownload,
  testFileDelete,
  runTests
};