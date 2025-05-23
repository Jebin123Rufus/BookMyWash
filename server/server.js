require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const Razorpay = require("razorpay");
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 5000;
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.replace(/"/g, ''),
    key_secret: process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_SECRET.replace(/"/g, '')
  });

app.use(bodyParser.json());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Connect to BookMyWash database
mongoose.connect(process.env.MONGODB_URI)

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
  createdAt: { type: Date, default: Date.now },
  notified: { type: Boolean, default: false } // Add notified field
});

// Extend Booking schema for multiple notifications
bookingSchema.add({
  notified1h: { type: Boolean, default: false },
  notified30m: { type: Boolean, default: false },
  notified5m: { type: Boolean, default: false },
  notifiedAfter30m: { type: Boolean, default: false },
  notifiedAfter1h: { type: Boolean, default: false }
});

const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

// Nodemailer transporter (configure with your email credentials)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper: send notification email
async function sendBookingNotification(booking) {
  if (!booking.email) return;
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: booking.email,
    subject: 'Laundry Slot Reminder - BookMyWash',
    text: `Hi,\n\nThis is a reminder that your laundry slot is scheduled for:\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\nPlease be on time.\n\n- BookMyWash Team`
  };
  await transporter.sendMail(mailOptions);
}

// Helper: send notification email with custom message
async function sendCustomNotification(booking, subject, text) {
  if (!booking.email) return;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: booking.email,
    subject,
    text
  });
}

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
    const { date, timeSlot, machine, email } = req.body;
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
    // Send confirmation email to user
    if (email) {
      try {
        // Confirmation email (immediately after booking)
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Booking Confirmed - BookMyWash',
          text: `Hi,\n\nYour laundry slot has been successfully booked!\n\nDate: ${date}\nTime: ${timeSlot}\nMachine: ${machine?.name || ''} (${machine?.location || ''})\n\nThank you for using BookMyWash!\n\n- BookMyWash Team`
        });
        console.log(`Booking confirmation email sent to ${email}`);
      } catch (e) {
        console.error('Error sending booking confirmation email:', e);
      }
    }
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
    const deleted = await Booking.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Booking not found or already deleted.' });
    }
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

// Scheduler: check every 2 minutes for all notification windows
setInterval(async () => {
  const now = new Date();
  const bookings = await Booking.find({
    status: 'upcoming',
    date: { $exists: true },
    timeSlot: { $exists: true }
  });
  for (const booking of bookings) {
    const slotStartStr = booking.timeSlot?.split('-')[0];
    if (!slotStartStr) continue;
    const dateStr = booking.date;
    const dateParts = dateStr.split(', ');
    const slotStart = new Date(`${dateParts[1]}, ${dateParts[2]} ${slotStartStr}`);
    if (isNaN(slotStart.getTime())) continue;
    const diffMs = slotStart - now;
    const diffMin = Math.round(diffMs / 60000);
    // Before 1 hour
    if (!booking.notified1h && diffMin <= 60 && diffMin > 58) {
      try {
        await sendCustomNotification(
          booking,
          'Laundry Slot Reminder - 1 hour left',
          `Hi,\n\nThis is a reminder that your laundry slot is in 1 hour.\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\n- BookMyWash Team`
        );
        booking.notified1h = true;
        await booking.save();
        console.log(`1h notification sent to ${booking.email}`);
      } catch (e) { console.error(e); }
    }
    // Before 30 minutes
    if (!booking.notified30m && diffMin <= 30 && diffMin > 28) {
      try {
        await sendCustomNotification(
          booking,
          'Laundry Slot Reminder - 30 minutes left',
          `Hi,\n\nYour laundry slot is in 30 minutes.\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\n- BookMyWash Team`
        );
        booking.notified30m = true;
        await booking.save();
        console.log(`30m notification sent to ${booking.email}`);
      } catch (e) { console.error(e); }
    }
    // Before 5 minutes
    if (!booking.notified5m && diffMin <= 5 && diffMin > 3) {
      try {
        await sendCustomNotification(
          booking,
          'Laundry Slot Reminder - 5 minutes left',
          `Hi,\n\nYour laundry slot is in 5 minutes.\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\n- BookMyWash Team`
        );
        booking.notified5m = true;
        await booking.save();
        console.log(`5m notification sent to ${booking.email}`);
      } catch (e) { console.error(e); }
    }
    // After 30 minutes
    if (!booking.notifiedAfter30m && diffMin <= -30 && diffMin > -32) {
      try {
        await sendCustomNotification(
          booking,
          'BookMyWash - Your Washing will be completed in 30 minutes',
          `Hi,\n\nYour laundry slot will be completed in 30 minutes.\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\nHope you had a good experience!\n\n- BookMyWash Team`
        );
        booking.notifiedAfter30m = true;
        await booking.save();
        console.log(`After 30m notification sent to ${booking.email}`);
      } catch (e) { console.error(e); }
    }
    // After 1 hour
    if (!booking.notifiedAfter1h && diffMin <= -60 && diffMin > -62) {
      try {
        await sendCustomNotification(
          booking,
          'BookMyWash - Your Washing has been completed!!',
          `Hi,\n\nYour laundry slot has been completed ,You can collect your washed clothes now.\n\nDate: ${booking.date}\nTime: ${booking.timeSlot}\nMachine: ${booking.machine?.name || ''} (${booking.machine?.location || ''})\n\nThank you for using BookMyWash!\n\n- BookMyWash Team`
        );
        booking.notifiedAfter1h = true;
        await booking.save();
        console.log(`After 1h notification sent to ${booking.email}`);
      } catch (e) { console.error(e); }
    }
  }
}, 2 * 60 * 1000); // every 2 minutes

app.listen(PORT, () => {
    console.log(`Server running at https://bookmywash-1.onrender.com`);
});

app.get('/', (req, res) => {
  res.send('🚀 BookMyWash API is running');
});
