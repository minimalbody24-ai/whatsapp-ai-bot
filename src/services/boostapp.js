const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../config');

const APPOINTMENTS_FILE = path.join(__dirname, '../../appointments.json');

// Helper to save locally
const saveLocally = (appointment) => {
  let appointments = [];
  try {
    if (fs.existsSync(APPOINTMENTS_FILE)) {
      const data = fs.readFileSync(APPOINTMENTS_FILE, 'utf8');
      appointments = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading appointments file", err);
  }

  appointments.push(appointment);
  fs.writeFileSync(APPOINTMENTS_FILE, JSON.stringify(appointments, null, 2));
  console.log("Saved appointment locally.");
};

const scheduleMeeting = async (details) => {
  const { firstName, lastName, phone, email, preferredTime } = details;
  const fullName = `${firstName} ${lastName}`;
  
  console.log(`[System] Processing lead for: ${fullName}`);

  const appointmentData = {
    firstName,
    lastName,
    phone,
    email,
    preferredTime,
    status: 'pending_manual',
    createdAt: new Date().toISOString()
  };

  // 1. Save locally
  saveLocally(appointmentData);

  // Zapier is DISABLED. We only save locally and return success.
  return { success: true, message: "Saved locally. Zapier disabled." };
};

module.exports = {
  scheduleMeeting,
};
