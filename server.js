const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Razorpay = require("razorpay");
const fs = require('fs');
const path = require('path');

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
  freeWash: { type: Number, default: 0 } // Add freeWash field
})

const User = mongoose.model('User', userSchema, 'User-logins');

// Booking schema and model
const bookingSchema = new mongoose.Schema({
  email: String,
  date: String,
  timeSlot: String,
  machine: Object,
  status: String,
  qrData: String, // Store the QR content (JSON string)
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

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

// Add a booking
app.post('/api/bookings', async (req, res) => {
  try {
    const { date, timeSlot, machine } = req.body;
    // Check if a booking already exists for this machine, date, and timeSlot
    const existing = await Booking.findOne({
      'machine.id': machine.id,
      date,
      timeSlot,
      status: 'upcoming'
    });
    if (existing) {
      return res.status(409).json({ message: 'Slot already booked for this machine.' });
    }
    const booking = new Booking(req.body);
    await booking.save();
    res.status(201).json({ message: 'Booking saved', booking });
  } catch (err) {
    res.status(500).json({ message: 'Error saving booking', error: err });
  }
});

// Get bookings for a user (all statuses)
app.get('/api/bookings', async (req, res) => {
  try {
    const { email } = req.query;
    const bookings = await Booking.find({ email }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err });
  }
});

// Get all bookings (for slot availability)
app.get('/api/all-bookings', async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'upcoming' });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err });
  }
});

// Delete a booking by _id
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting booking', error: err });
  }
});

// API to get free wash count for a user
app.get('/api/free-wash', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ freeWash: user.freeWash || 0 });
});

// API to increment free wash count for a user
app.post('/api/free-wash/increment', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = await User.findOneAndUpdate(
    { email },
    { $inc: { freeWash: 1 } },
    { new: true }
  );
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ freeWash: user.freeWash });
});

// API to decrement free wash count for a user
app.post('/api/free-wash/decrement', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'User not found' });
  if ((user.freeWash || 0) <= 0) return res.status(400).json({ message: 'No free washes left' });
  user.freeWash = (user.freeWash || 0) - 1;
  await user.save();
  res.json({ freeWash: user.freeWash });
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

// Feedback storage (JSON file)
const FEEDBACK_FILE = path.join(__dirname, 'feedbacks.json');

// API endpoint to receive feedback and store in feedbacks.json
app.post('/api/feedback', (req, res) => {
  const { feedback } = req.body;
  if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
    return res.status(400).json({ message: 'Feedback required' });
  }
  let feedbacks = [];
  try {
    if (fs.existsSync(FEEDBACK_FILE)) {
      feedbacks = JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8'));
    }
  } catch (e) {
    feedbacks = [];
  }
  feedbacks.push({ feedback, createdAt: new Date().toISOString() });
  try {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2));
    res.status(201).json({ message: 'Feedback received' });
  } catch (e) {
    res.status(500).json({ message: 'Error saving feedback', error: e });
  }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
  res.send('🚀 BookMyWash API is running');
});
