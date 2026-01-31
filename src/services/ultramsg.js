const axios = require('axios');
const config = require('../config');

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
    return response.data;
  } catch (error) {
    console.error('Error sending message via UltraMsg:', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = {
  sendMessage,
};
