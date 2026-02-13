const axios = require('axios');
const config = require('../config');
const FormData = require('form-data');
const fs = require('fs');

// Using the host from the user's screenshot
const BASE_URL = `https://7103.api.greenapi.com`;

const sendMessage = async (to, message) => {
  try {
    // Green-API format: "number@c.us"
    // Ensure 'to' is clean number first
    let cleanTo = to.replace(/[^0-9]/g, '');
    const chatId = `${cleanTo}@c.us`;

    const url = `${BASE_URL}/waInstance${config.greenapi.idInstance}/sendMessage/${config.greenapi.apiTokenInstance}`;
    
    const response = await axios.post(url, {
      chatId: chatId,
      message: message
    });

    console.log(`[Green-API] Sent to ${to}. ID: ${response.data.idMessage}`);
    return response.data;
  } catch (error) {
    console.error('Error sending message via Green-API:', error.response ? error.response.data : error.message);
    return null;
  }
};

const sendDocument = async (to, filePath, caption = "") => {
  try {
    let cleanTo = to.replace(/[^0-9]/g, '');
    const chatId = `${cleanTo}@c.us`;
    const fileName = filePath.split('/').pop();

    const form = new FormData();
    form.append('chatId', chatId);
    form.append('caption', caption);
    form.append('file', fs.createReadStream(filePath), fileName);

    const url = `${BASE_URL}/waInstance${config.greenapi.idInstance}/sendFileByUpload/${config.greenapi.apiTokenInstance}`;

    const response = await axios.post(url, form, {
      headers: {
        ...form.getHeaders()
      }
    });

    console.log(`[Green-API] Document sent to ${to}. ID: ${response.data.idMessage}`);
    return response.data;

  } catch (error) {
    console.error('Error sending document via Green-API:', error.response ? error.response.data : error.message);
    return null;
  }
};

module.exports = {
  sendMessage,
  sendDocument
};
