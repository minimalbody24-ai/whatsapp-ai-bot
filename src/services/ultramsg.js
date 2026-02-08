const axios = require('axios');
const config = require('../config');
const fs = require('fs');
const path = require('path');

const sendMessage = async (to, body) => {
  try {
    const data = JSON.stringify({
      token: config.ultramsg.token,
      to: to,
      body: body
    });

    const options = {
      method: 'post',
      url: `https://api.ultramsg.com/${config.ultramsg.instanceId}/messages/chat`,
      headers: { 
        'Content-Type': 'application/json' 
      },
      data: data
    };

    const response = await axios(options);
    console.log(`[UltraMsg] Sent to ${to}. Status: ${response.data.sent}`);
    return response.data;
  } catch (error) {
    console.error('Error sending message via UltraMsg:', error.response ? error.response.data : error.message);
    // Don't throw, just log, so the bot doesn't crash
    return null;
  }
};

const sendDocument = async (to, filePath, caption = "") => {
  try {
    // Read file and convert to Base64
    const fileData = fs.readFileSync(filePath, { encoding: 'base64' });
    const fileName = path.basename(filePath);
    
    // PDF mime type
    const mimeType = 'application/pdf'; 
    const dataUri = `data:${mimeType};base64,${fileData}`;

    const data = JSON.stringify({
      token: config.ultramsg.token,
      to: to,
      filename: fileName,
      document: dataUri,
      caption: caption
    });

    const options = {
      method: 'post',
      url: `https://api.ultramsg.com/${config.ultramsg.instanceId}/messages/document`,
      headers: { 
        'Content-Type': 'application/json' 
      },
      data: data
    };

    const response = await axios(options);
    console.log(`[UltraMsg] Document sent to ${to}. Status: ${response.data.sent}`);
    return response.data;
  } catch (error) {
    console.error('Error sending document via UltraMsg:', error.response ? error.response.data : error.message);
    return null;
  }
};

module.exports = {
  sendMessage,
  sendDocument
};
