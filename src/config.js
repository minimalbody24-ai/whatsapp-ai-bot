require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    assistantId: process.env.ASSISTANT_ID,
  },
  ultramsg: {
    instanceId: process.env.ULTRAMSG_INSTANCE_ID,
    token: process.env.ULTRAMSG_TOKEN,
  },
  boostapp: {
    // Zapier disabled for now
    zapierWebhookUrl: null, 
    apiKey: process.env.BOOSTAPP_API_KEY || 'eyJzIjoxLCJzdSI6IjY3OGY4ZjA2OGQ4YTgifQ==',
    baseUrl: process.env.BOOSTAPP_BASE_URL || 'https://api.boostapp.com', 
  },
  humanAgent: {
    // Updated to the correct number: 052-577-2886 -> 972525772886
    phone: '972525772886', 
  }
};
