const axios = require('axios');
const config = require('../config');

// Stub function to schedule a meeting
const scheduleMeeting = async (clientName, clientPhone, preferredTime) => {
  console.log(`[Boostapp] Scheduling meeting for ${clientName} (${clientPhone}) at ${preferredTime}`);
  
  // TODO: Replace with actual Boostapp API call
  // Example:
  // const response = await axios.post(`${config.boostapp.baseUrl}/appointments`, { ... });
  
  return { success: true, message: "Meeting scheduled locally (stub)." };
};

module.exports = {
  scheduleMeeting,
};
