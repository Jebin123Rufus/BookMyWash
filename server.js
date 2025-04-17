const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Razorpay = require("razorpay");

const app = express();
const PORT = 5000;
const razorpay = new Razorpay({
    key_id: "rzp_test_DmCYM9dC5cVIgf",
    key_secret: "jn25gcmlXcRlOlvE1qKK8Sdl",
  });

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
