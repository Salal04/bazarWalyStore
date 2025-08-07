require('dotenv').config();
const crypto = require('crypto');
console.log("ENV ENCRYPTION_KEY: ---> ", process.env.ENCRYPTION_KEY);
console.log("ENV IV: --->", process.env.IV);


// 32 bytes key for AES-256
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // You can save this in env
const IV =Buffer.from(process.env.IV, 'hex');
console.log(ENCRYPTION_KEY , ' : ' ,IV )
 // Initialization vector

// Encrypt Function
function encrypt(text) {
  console.log('---------- text -- > ' , text)
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  console.log(encrypted ,'====',IV.toString('hex'))
  return {
    iv: IV.toString('hex'),
    content: encrypted
  };
}

// Decrypt Function
function decrypt(encryptedData) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    ENCRYPTION_KEY,
    Buffer.from(encryptedData.iv, 'hex')
  );
  let decrypted = decipher.update(encryptedData.content, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = {
  encrypt,
  decrypt
};
