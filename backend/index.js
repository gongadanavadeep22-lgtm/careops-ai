require('dotenv').config({
  quiet: process.env.NODE_ENV === 'production',
});
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CareOps AI backend running on port ${PORT}`);
});
