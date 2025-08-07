const jwt = require('jsonwebtoken');

// Test JWT token
const testToken = (token) => {
  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    console.log('JWT Decoded:', decoded);
    console.log('User ID:', decoded.userId);
    console.log('Name:', decoded.name);
    console.log('Email:', decoded.email);
    console.log('First Name:', decoded.first_name);
    console.log('Last Name:', decoded.last_name);
  } catch (error) {
    console.error('JWT Error:', error.message);
  }
};

// Test với token từ localStorage (cần copy từ browser)
const token = process.argv[2];
if (token) {
  testToken(token);
} else {
  console.log('Usage: node test-jwt.js <token>');
} 