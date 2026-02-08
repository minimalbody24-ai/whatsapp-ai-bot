const boostappService = require('../src/services/boostapp');

async function test() {
  console.log("Starting Zapier Direct Test...");
  
  const fakeDetails = {
    firstName: "TestUser",
    lastName: "DirectTest",
    phone: "0509999999",
    email: "test@direct.com",
    preferredTime: "יום ראשון בבוקר"
  };

  console.log("Calling scheduleMeeting with:", fakeDetails);
  
  const result = await boostappService.scheduleMeeting(fakeDetails);
  
  console.log("Result:", result);
}

test();
