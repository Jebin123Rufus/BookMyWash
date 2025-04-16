const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Connect to BookMyWash database
mongoose.connect('mongodb://localhost:27017/bookmywash', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Mongoose schema and model for 'User-logins' in 'Users' collection
const userLoginSchema = new mongoose.Schema({
    name: String,
    email: String,
}, { collection: 'User-logins' }); // This targets the correct collection

const UserLogin = mongoose.model('UserLogin', userLoginSchema);

// Route to handle login
app.post('/api/login', async (req, res) => {
  try {
      const { name, email } = req.body;
      console.log("Received data:", name, email); // 👈 log inputs

      const user = new UserLogin({ name, email });
      const savedUser = await user.save();
      console.log("Saved user:", savedUser); // 👈 log success

      res.status(200).json({ message: 'User login saved!' });
  } catch (error) {
      console.error("MongoDB Save Error:", error); // 👈 print full error
      res.status(500).json({ message: 'Failed to save login' });
  }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🚀 BookMyWash API is running');
});
