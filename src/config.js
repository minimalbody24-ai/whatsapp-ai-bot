require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  ultramsg: {
    instanceId: process.env.ULTRAMSG_INSTANCE_ID,
    token: process.env.ULTRAMSG_TOKEN,
  },
  boostapp: {
    apiKey: process.env.BOOSTAPP_API_KEY,
    baseUrl: process.env.BOOSTAPP_BASE_URL || 'https://api.boostapp.com', // Replace with actual URL
  },
  humanAgent: {
    phone: process.env.HUMAN_AGENT_PHONE, // Phone number to escalate to
  }
};
