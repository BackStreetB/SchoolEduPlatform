const fetch = require('node-fetch');

const testLogin = async () => {
  try {
    console.log('Testing login...');
    
    const response = await fetch('http://localhost:3001/api/auth/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'hoa@school.com',
        password: 'password123'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Login successful!');
      console.log('Access Token:', data.data.accessToken.substring(0, 50) + '...');
      console.log('User Info:', data.data.user);
      
      // Test token với endpoint mới
      const tokenResponse = await fetch('http://localhost:3001/api/auth/auth/test-token', {
        headers: {
          'Authorization': `Bearer ${data.data.accessToken}`
        }
      });
      
      const tokenData = await tokenResponse.json();
      console.log('Token Test Result:', tokenData);
      
    } else {
      console.log('Login failed:', data);
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testLogin(); 