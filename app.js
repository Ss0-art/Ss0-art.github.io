const express = require("express");
const app = express();
const port = 3200;
const cors = require("cors");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require("mongoose");
require("./db/mongodb");
const User = require("./db/Users");
const Review = require("./db/Review");
const SupportRequest = require('./db/SupportRequest');




const dirName = path.join(__dirname, "static");

app.use(cors());
app.use(express.json());
app.use(express.static(dirName));
app.use((req, res, next) => {
  if (req.path === '/track-click' && req.method === 'POST') {
    console.log('⭐ Track click request received');
    console.log('Request body:', req.body);
  }
  next();
});


app.get("/", (req, res) => {
  res.sendFile(path.join(dirName, "index.html"));
});
app.get("/intro", (req, res) => {
  res.sendFile(path.join(dirName, "intro.html"));
});
app.get("/reset", (req, res) => {
  res.sendFile(path.join(dirName, "reset.html"));
});
app.get("/home", (req, res) => {
  res.sendFile(path.join(dirName, "home.html"));
});
app.get("/help", (req, res) => {
  res.sendFile(path.join(dirName, "help.html"));
});
app.get("/adminlogin", (req, res) => {
  res.sendFile(path.join(dirName, "adminlogin.html"));
});
app.get("/admindashboard", (req, res) => {
  res.sendFile(path.join(dirName, "admindashboard.html"));
});

app.get("/run-python", (req, res) => {
  const pythonFilePath = path.join(__dirname, "drowsiness_detect.py");
  exec(`python "${pythonFilePath}"`, (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(500).json({ error: error?.message || stderr });
    }
    res.json({ output: stdout });
  });
});

// SERVER-SIDE CODE - Add this to your server.js

// Registration endpoint
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user with registration timestamp
    const newUser = new User({
      name,
      email,
      password, // Note: In production, you should hash passwords
      registeredAt: new Date() // Adding timestamp for registration time
    });

    await newUser.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login endpoint - You already have this, but I'm including for completeness
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ message: 'Invalid password.' });
    }

    res.status(200).json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


app.get("/run-python", (req, res) => {
  const pythonFilePath = path.join(__dirname, "drowsiness_detect.py");
  exec(`python "${pythonFilePath}"`, (error, stdout, stderr) => {
    if (error || stderr) {
      return res.status(500).json({ error: error?.message || stderr });
    }
    res.json({ output: stdout });
  });
});





// GET endpoint to retrieve user data
app.get('/usersdetails', async (req, res) => {

  try {
    // Find all users in the database
    const users = await User.find().select('-password'); // Excluding password field for security

    // Check if any users were found
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }

    // Return users data
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




// PUT endpoint to reset user password
app.put('/reset-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword; // In production, hash this password

    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




app.post('/track-click', async (req, res) => {
  const { userEmail } = req.body;

  try {
    console.log('✅ Track click request received');
    console.log('Request body:', req.body);

    if (!userEmail) {
      return res.status(400).json({ message: 'User email is required' });
    }

    // Find the user in the User model
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({
        message: 'User not found. Please login first.',
        status: 'error'
      });
    }

    // Update clickCount and lastClicked
    user.clickCount = (user.clickCount || 0) + 1;
    user.lastClicked = new Date();
    await user.save();

    console.log('Updated user click count:', user.clickCount);

    return res.status(200).json({
      message: 'Click tracked successfully',
      userEmail: user.email,
      clickCount: user.clickCount,
      lastClicked: user.lastClicked,
      status: 'success'
    });

  } catch (err) {
    console.error('Error tracking click:', err);
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      status: 'error'
    });
  }
});

app.get('/debug-collections', async (req, res) => {
  try {
    // Get all collection names
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('Collections in database:', collectionNames);

    // Try to find users in each collection
    let results = {};
    for (const name of collectionNames) {
      try {
        const items = await mongoose.connection.db.collection(name).find({}).limit(5).toArray();
        results[name] = items;
      } catch (err) {
        results[name] = `Error: ${err.message}`;
      }
    }

    res.json({
      collections: collectionNames,
      sampleData: results
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message });
  }
});





// Review API Routes
app.post('/api/reviews', async (req, res) => {
  const { name, email, rating, comment } = req.body;

  // Validate required fields
  if (!name || !email || !rating) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and rating are required'
    });
  }

  try {
    const newReview = new Review({
      name,
      email,
      rating,
      comment,
      createdAt: new Date()
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review: newReview
    });
  } catch (error) {
    console.error('Error saving review:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
  }
});

// GET reviews (for testing)
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
});




// POST route for support requests
app.post('/api/support-requests', async (req, res) => {
  try {
    console.log('Received support request:', req.body);

    const supportRequest = new SupportRequest({
      name: req.body.name,
      email: req.body.email,
      phoneNumber: req.body.phoneNumber,
      message: req.body.message,
    });

    const savedRequest = await supportRequest.save();
    console.log('Support request saved:', savedRequest);

    res.status(201).json({
      success: true,
      message: 'Support request submitted successfully!'
    });
  } catch (error) {
    console.error('Error saving support request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit support request.',
      error: error.message
    });
  }
});

// Route to get all support requests (for testing/admin purposes)
app.get('/api/support-requests', async (req, res) => {
  try {
    const requests = await SupportRequest.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching support requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch requests', error: error.message });
  }
});






app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
