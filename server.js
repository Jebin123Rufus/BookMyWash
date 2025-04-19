const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Razorpay = require("razorpay");

const app = express();
const PORT = 5000;
const razorpay = new Razorpay({
    key_id: "rzp_test_DmCYM9dC5cVIgf",
    key_secret: "jn25gcmlXcRlOlvE1qKK8Sdl",
  });

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

// Connect to BookMyWash database
mongoose.connect('mongodb://localhost:27017/bookmywash', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Mongoose schema and model for 'User-logins' in 'Users' collection
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
})

const User = mongoose.model('User', userSchema, 'User-logins');

// Route to handle login
app.post('/api/login', async (req, res) => {
  const { name, email } = req.body;

  try {
    // Check if the email already exists in the database
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(200).json({ message: 'Welcome Back to BookMyWash!! ', username: existingUser.name });
    }

    // Save the new user to the database
    const newUser = new User({ name, email });
    await newUser.save();

    res.status(200).json({ message: 'User saved successfully.', username: newUser.name });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

app.post("/create-order", async (req, res) => {
    const options = {
      amount: 50000, // Amount in paise
      currency: "INR",
      receipt: "order_rcptid_11",
    };
  
    try {
      const order = await razorpay.orders.create(options);
      res.json(order);
    } catch (error) {
      res.status(500).send(error);
    }
  });

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🚀 BookMyWash API is running');
});
