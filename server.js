require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================
app.use(cors({
  origin: '*', // In production, specify your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'riara_accommodation_secret_2025';
const TOKEN_EXPIRY = '24h';

// ============================================
// UTILITY FUNCTIONS
// ============================================
const generateToken = (user) => {
  return jwt.sign(
    { 
      user_id: user.user_id, 
      role: user.role, 
      email: user.email,
      is_verified: user.is_verified 
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const [rows] = await db.query('SELECT * FROM User WHERE email = ?', [email]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.user_id,
        name: user.full_name,
        role: user.role,
        email: user.email,
        is_verified: user.is_verified
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, role, full_name, phone_number } = req.body;

    // Validation
    if (!username || !email || !password || !role || !full_name) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    if (!['student', 'landlord'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be student or landlord' });
    }

    const [existingUsers] = await db.query(
      'SELECT * FROM User WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await db.query(
      `INSERT INTO User (username, email, password_hash, role, full_name, phone_number, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [sanitizeInput(username), email, password_hash, role, sanitizeInput(full_name), phone_number || null]
    );

    res.status(201).json({
      message: 'Registration successful',
      user_id: result.insertId
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================
app.get('/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, email, role, full_name, phone_number, is_verified, created_at FROM User ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT user_id, username, email, role, full_name, phone_number, is_verified, created_at FROM User WHERE user_id = ?',
      [req.user.user_id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Get all pending verifications (Admin only)
app.get('/verifications', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT v.*, 
             u.full_name, 
             u.email, 
             u.username,
             u.phone_number,
             u.created_at as user_created_at,
             verified_by_user.full_name as verified_by_name
      FROM Verification v
      JOIN User u ON v.user_id = u.user_id
      LEFT JOIN User verified_by_user ON v.verified_by = verified_by_user.user_id
    `;
    
    const params = [];
    
    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' WHERE v.status = ?';
      params.push(status);
    } else {
      // Default to pending only
      query += ' WHERE v.status = "pending"';
    }
    
    query += ' ORDER BY v.verification_id DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching verifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ============================================
// LANDLORD VERIFICATION ENDPOINTS  
// ============================================

// Submit verification (Landlord only)
app.post('/verifications', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { verification_type, document_url } = req.body;

    if (!verification_type || !document_url) {
      return res.status(400).json({ error: 'Verification type and document URL are required' });
    }

    const validTypes = ['national_id', 'title_deed', 'utility_bill', 'other'];
    if (!validTypes.includes(verification_type)) {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    const [existing] = await db.query(
      `SELECT * FROM Verification 
       WHERE user_id = ? AND verification_type = ? AND status IN ('pending', 'approved')`,
      [req.user.user_id, verification_type]
    );

    if (existing.length > 0) {
      return res.status(400).json({ 
        error: `You already have a ${existing[0].status} verification of this type` 
      });
    }

    const [result] = await db.query(
      `INSERT INTO Verification (user_id, verification_type, document_url, status) 
       VALUES (?, ?, ?, 'pending')`,
      [req.user.user_id, verification_type, sanitizeInput(document_url)]
    );

    res.status(201).json({
      message: 'Verification submitted successfully. Awaiting admin approval.',
      verification_id: result.insertId
    });
  } catch (err) {
    console.error('Error submitting verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get my verifications (Landlord only)
app.get('/verifications/my', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT v.*, 
              verified_by_user.full_name as verified_by_name
       FROM Verification v
       LEFT JOIN User verified_by_user ON v.verified_by = verified_by_user.user_id
       WHERE v.user_id = ?
       ORDER BY v.verification_id DESC`,
      [req.user.user_id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('Error fetching my verifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ============================================
// LISTING ENDPOINTS
// ============================================
app.get('/listings', async (req, res) => {
  try {
    const { 
      location, 
      status = 'available', 
      landlord_id, 
      min_price, 
      max_price, 
      max_distance, 
      sort = 'newest'
    } = req.query;

    let sql = 'SELECT l.*, u.full_name as landlord_name, u.phone_number as landlord_phone FROM Listing l JOIN User u ON l.landlord_id = u.user_id WHERE l.is_verified = 1';
    const params = [];

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    if (location) {
      sql += ' AND l.location LIKE ?';
      params.push(`%${sanitizeInput(location)}%`);
    }

    if (landlord_id) {
      sql += ' AND l.landlord_id = ?';
      params.push(parseInt(landlord_id));
    }

    if (min_price) {
      sql += ' AND l.price >= ?';
      params.push(parseFloat(min_price));
    }
    
    if (max_price) {
      sql += ' AND l.price <= ?';
      params.push(parseFloat(max_price));
    }

    if (max_distance) {
      sql += ' AND l.proximity_to_campus <= ?';
      params.push(parseFloat(max_distance));
    }

    const validSorts = {
      'price_asc': 'l.price ASC',
      'price_desc': 'l.price DESC',
      'distance': 'l.proximity_to_campus ASC',
      'newest': 'l.created_at DESC'
    };
    sql += ` ORDER BY ${validSorts[sort] || 'l.created_at DESC'}`;

    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/listings/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT l.*, u.full_name as landlord_name, u.phone_number as landlord_phone, u.email as landlord_email
       FROM Listing l 
       JOIN User u ON l.landlord_id = u.user_id 
       WHERE l.listing_id = ?`,
      [req.params.id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching listing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/listings', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    // Re-check verification status from DB (JWT may be stale after admin approval)
    const [landlordRows] = await db.query(
      'SELECT is_verified FROM User WHERE user_id = ?',
      [req.user.user_id]
    );
    if (!landlordRows.length || !landlordRows[0].is_verified) {
      return res.status(403).json({ 
        error: 'You must be verified before creating listings. Please submit your verification documents.',
        code: 'NOT_VERIFIED'
      });
    }

    const { title, description, location, price, amenities, proximity_to_campus, available_from } = req.body;

    // Enhanced validation
    if (!title || !location || !price || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Title, location, and a positive price are required' });
    }

    const sanitizedData = {
      title: sanitizeInput(title),
      description: sanitizeInput(description || ''),
      location: sanitizeInput(location),
      price: parseFloat(price),
      amenities: sanitizeInput(amenities || ''),
      proximity_to_campus: proximity_to_campus ? parseFloat(proximity_to_campus) : null,
      available_from: available_from || null
    };

    const [result] = await db.query(
      `INSERT INTO Listing (landlord_id, title, description, location, price, amenities, proximity_to_campus, available_from, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [req.user.user_id, ...Object.values(sanitizedData)]
    );

    console.log(`New listing created by verified landlord ${req.user.user_id}: ID ${result.insertId}`);
    res.status(201).json({ 
      message: 'Listing created successfully. Awaiting admin verification.', 
      listing_id: result.insertId 
    });
  } catch (err) {
    console.error('Error creating listing:', err);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

app.put('/listings/:id', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { title, description, location, price, amenities, proximity_to_campus, available_from, status } = req.body;

    // Verify ownership
    const [listing] = await db.query(
      'SELECT * FROM Listing WHERE listing_id = ? AND landlord_id = ?',
      [req.params.id, req.user.user_id]
    );

    if (listing.length === 0) {
      return res.status(404).json({ error: 'Listing not found or you do not have permission to edit it' });
    }

    const updates = [];
    const values = [];

    if (title) { updates.push('title = ?'); values.push(sanitizeInput(title)); }
    if (description) { updates.push('description = ?'); values.push(sanitizeInput(description)); }
    if (location) { updates.push('location = ?'); values.push(sanitizeInput(location)); }
    if (price) { updates.push('price = ?'); values.push(parseFloat(price)); }
    if (amenities) { updates.push('amenities = ?'); values.push(sanitizeInput(amenities)); }
    if (proximity_to_campus !== undefined) { updates.push('proximity_to_campus = ?'); values.push(proximity_to_campus); }
    if (available_from) { updates.push('available_from = ?'); values.push(available_from); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);

    await db.query(
      `UPDATE Listing SET ${updates.join(', ')} WHERE listing_id = ?`,
      values
    );

    res.json({ message: 'Listing updated successfully' });
  } catch (err) {
    console.error('Error updating listing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/listings/:id', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const [listing] = await db.query(
      'SELECT * FROM Listing WHERE listing_id = ? AND landlord_id = ?',
      [req.params.id, req.user.user_id]
    );

    if (listing.length === 0) {
      return res.status(404).json({ error: 'Listing not found or you do not have permission to delete it' });
    }

    await db.query('DELETE FROM Listing WHERE listing_id = ?', [req.params.id]);

    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    console.error('Error deleting listing:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// BOOKING ENDPOINTS
// ============================================
app.get('/bookings', authenticateToken, async (req, res) => {
  try {
    let sql = `
      SELECT b.*, l.title as listing_title, l.location as listing_location, l.price as listing_price,
             s.full_name as student_name, s.email as student_email, s.phone_number as student_phone,
             u.full_name as landlord_name
      FROM Booking b
      JOIN Listing l ON b.listing_id = l.listing_id
      JOIN User s ON b.student_id = s.user_id
      JOIN User u ON l.landlord_id = u.user_id
    `;
    const params = [];

    if (req.user.role === 'student') {
      sql += ' WHERE b.student_id = ?';
      params.push(req.user.user_id);
    } else if (req.user.role === 'landlord') {
      sql += ' WHERE l.landlord_id = ?';
      params.push(req.user.user_id);
    }

    sql += ' ORDER BY b.created_at DESC';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/bookings', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { listing_id, booking_date } = req.body;

    if (!listing_id || !booking_date) {
      return res.status(400).json({ error: 'Listing ID and booking date are required' });
    }

    // Check if listing exists and is available
    const [listing] = await db.query(
      'SELECT * FROM Listing WHERE listing_id = ? AND status = "available" AND is_verified = 1',
      [listing_id]
    );
    
    if (listing.length === 0) {
      return res.status(400).json({ error: 'Listing not available for booking' });
    }

    // Check if student already has a booking for this listing
    const [existingBooking] = await db.query(
      'SELECT * FROM Booking WHERE student_id = ? AND listing_id = ? AND status != "cancelled"',
      [req.user.user_id, listing_id]
    );

    if (existingBooking.length > 0) {
      return res.status(400).json({ error: 'You already have a booking for this listing' });
    }

    const [result] = await db.query(
      'INSERT INTO Booking (student_id, listing_id, booking_date, status) VALUES (?, ?, ?, "pending")',
      [req.user.user_id, listing_id, booking_date]
    );

    await db.query(
      'UPDATE Listing SET status = "booked" WHERE listing_id = ?',
      [listing_id]
    );

    res.status(201).json({ 
      message: 'Booking successful! Awaiting landlord confirmation.',
      booking_id: result.insertId
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/bookings/:id/confirm', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const [booking] = await db.query(
      `SELECT b.*, l.landlord_id FROM Booking b 
       JOIN Listing l ON b.listing_id = l.listing_id 
       WHERE b.booking_id = ?`,
      [req.params.id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking[0].landlord_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to confirm this booking' });
    }

    if (booking[0].status === 'confirmed') {
      return res.status(400).json({ error: 'Booking already confirmed' });
    }

    await db.query(
      'UPDATE Booking SET status = "confirmed" WHERE booking_id = ?',
      [req.params.id]
    );

    res.json({ message: 'Booking confirmed successfully' });
  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const [booking] = await db.query(
      `SELECT b.*, l.landlord_id FROM Booking b 
       JOIN Listing l ON b.listing_id = l.listing_id 
       WHERE b.booking_id = ?`,
      [req.params.id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Only student who made booking or landlord can cancel
    if (booking[0].student_id !== req.user.user_id && booking[0].landlord_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (booking[0].status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    await db.query('UPDATE Booking SET status = "cancelled" WHERE booking_id = ?', [req.params.id]);
    await db.query('UPDATE Listing SET status = "available" WHERE listing_id = ?', [booking[0].listing_id]);

    res.json({ message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// MESSAGING ENDPOINTS
// ============================================
app.get('/messages/conversations', authenticateToken, async (req, res) => {
  try {
    const [conversations] = await db.query(
      `SELECT DISTINCT
         CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
         u.full_name as other_user_name,
         u.role as other_user_role,
         (SELECT content FROM Message m2 
          WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id)
             OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
          ORDER BY m2.sent_at DESC LIMIT 1) as last_message,
         (SELECT sent_at FROM Message m2 
          WHERE (m2.sender_id = ? AND m2.receiver_id = other_user_id)
             OR (m2.sender_id = other_user_id AND m2.receiver_id = ?)
          ORDER BY m2.sent_at DESC LIMIT 1) as last_message_time,
         (SELECT COUNT(*) FROM Message m3
          WHERE m3.receiver_id = ? AND m3.sender_id = other_user_id AND m3.is_read = 0) as unread_count
       FROM Message m
       JOIN User u ON u.user_id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY last_message_time DESC`,
      [req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, 
       req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id]
    );

    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/messages/conversation/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const [messages] = await db.query(
      `SELECT m.*, s.full_name as sender_name, l.title as listing_title
       FROM Message m
       JOIN User s ON m.sender_id = s.user_id
       LEFT JOIN Listing l ON m.listing_id = l.listing_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?) 
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.sent_at ASC`,
      [req.user.user_id, req.params.otherUserId, req.params.otherUserId, req.user.user_id]
    );

    // Mark messages as read
    await db.query(
      'UPDATE Message SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0',
      [req.user.user_id, req.params.otherUserId]
    );

    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/messages', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, listing_id, content } = req.body;

    if (!receiver_id || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    // Check if receiver exists
    const [receiver] = await db.query('SELECT user_id FROM User WHERE user_id = ?', [receiver_id]);
    if (receiver.length === 0) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const [result] = await db.query(
      'INSERT INTO Message (sender_id, receiver_id, listing_id, content, sent_at) VALUES (?, ?, ?, ?, NOW())',
      [req.user.user_id, receiver_id, listing_id || null, sanitizeInput(content)]
    );

    res.status(201).json({ 
      message: 'Message sent successfully',
      message_id: result.insertId
    });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/messages', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT m.*, s.full_name as sender_name, r.full_name as receiver_name, l.title as listing_title
       FROM Message m
       JOIN User s ON m.sender_id = s.user_id
       JOIN User r ON m.receiver_id = r.user_id
       LEFT JOIN Listing l ON m.listing_id = l.listing_id
       WHERE m.sender_id = ? OR m.receiver_id = ?
       ORDER BY m.sent_at DESC`,
      [req.user.user_id, req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ============================================
// STUDENT VERIFICATION BY LANDLORD
// ============================================

// Student submits a verification request to their landlord
// The student calls this AFTER they have a confirmed booking
app.post('/student-verification/request', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { landlord_id, document_url, document_type } = req.body;

    if (!landlord_id || !document_url) {
      return res.status(400).json({ error: 'Landlord ID and document URL are required' });
    }

    // Make sure the landlord actually exists and IS a landlord
    const [landlordRows] = await db.query(
      'SELECT user_id FROM User WHERE user_id = ? AND role = "landlord"',
      [landlord_id]
    );
    if (landlordRows.length === 0) {
      return res.status(404).json({ error: 'Landlord not found' });
    }

    // Check if student already has a pending request to this landlord
    const [existing] = await db.query(
      'SELECT * FROM StudentVerification WHERE student_id = ? AND landlord_id = ? AND status = "pending"',
      [req.user.user_id, landlord_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have a pending verification request with this landlord' });
    }

    const [result] = await db.query(
      `INSERT INTO StudentVerification (student_id, landlord_id, document_url, document_type, status)
       VALUES (?, ?, ?, ?, "pending")`,
      [req.user.user_id, landlord_id, sanitizeInput(document_url), sanitizeInput(document_type || 'student_id')]
    );

    res.status(201).json({
      message: 'Verification request sent to landlord successfully',
      student_verification_id: result.insertId
    });
  } catch (err) {
    console.error('Error submitting student verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Landlord views all student verification requests sent to them
app.get('/student-verification/requests', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { status } = req.query; // optional filter: pending / approved / rejected

    let query = `
      SELECT sv.*,
             u.full_name as student_name,
             u.email as student_email,
             u.phone_number as student_phone
      FROM StudentVerification sv
      JOIN User u ON sv.student_id = u.user_id
      WHERE sv.landlord_id = ?
    `;
    const params = [req.user.user_id];

    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' AND sv.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sv.submitted_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching student verifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Student views their own verification requests
app.get('/student-verification/my', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT sv.*,
              u.full_name as landlord_name,
              u.email as landlord_email
       FROM StudentVerification sv
       JOIN User u ON sv.landlord_id = u.user_id
       WHERE sv.student_id = ?
       ORDER BY sv.submitted_at DESC`,
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching my student verifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Landlord approves or rejects a student's verification
app.put('/student-verification/:id/review', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    // Find the verification and make sure this landlord owns it
    const [rows] = await db.query(
      'SELECT * FROM StudentVerification WHERE student_verification_id = ? AND landlord_id = ?',
      [req.params.id, req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Verification request not found' });
    }

    if (rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been reviewed' });
    }

    await db.query(
      'UPDATE StudentVerification SET status = ?, notes = ?, reviewed_at = NOW() WHERE student_verification_id = ?',
      [status, sanitizeInput(notes || ''), req.params.id]
    );

    // If approved, mark the student as verified in the User table
    if (status === 'approved') {
      await db.query('UPDATE User SET is_verified = 1 WHERE user_id = ?', [rows[0].student_id]);
    }

    res.json({ message: `Student verification ${status} successfully` });
  } catch (err) {
    console.error('Error reviewing student verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// ============================================
// VERIFICATION ENDPOINTS
// ============================================
app.post('/verification/request', authenticateToken, requireRole('landlord'), async (req, res) => {
  try {
    const { verification_type, document_url } = req.body;

    if (!verification_type || !document_url) {
      return res.status(400).json({ error: 'Verification type and document URL are required' });
    }

    const validTypes = ['national_id', 'title_deed', 'utility_bill', 'other'];
    if (!validTypes.includes(verification_type)) {
      return res.status(400).json({ error: 'Invalid verification type' });
    }

    // Check if there's already a pending verification
    const [pending] = await db.query(
      'SELECT * FROM Verification WHERE user_id = ? AND status = "pending"',
      [req.user.user_id]
    );

    if (pending.length > 0) {
      return res.status(400).json({ error: 'You already have a pending verification request' });
    }

    const [result] = await db.query(
      'INSERT INTO Verification (user_id, verification_type, document_url, status) VALUES (?, ?, ?, "pending")',
      [req.user.user_id, verification_type, document_url]
    );

    res.status(201).json({ 
      message: 'Verification request submitted successfully',
      verification_id: result.insertId
    });
  } catch (err) {
    console.error('Error requesting verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all pending verifications (Admin only)
app.get('/verifications', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT v.*, 
             u.full_name, 
             u.email, 
             u.username,
             u.phone_number,
             u.created_at as user_created_at,
             verified_by_user.full_name as verified_by_name
      FROM Verification v
      JOIN User u ON v.user_id = u.user_id
      LEFT JOIN User verified_by_user ON v.verified_by = verified_by_user.user_id
    `;
    
    const params = [];
    
    // Filter by status if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query += ' WHERE v.status = ?';
      params.push(status);
    } else {
      // Default to pending only
      query += ' WHERE v.status = "pending"';
    }
    
    query += ' ORDER BY v.verification_id DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching verifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/verification/:id/review', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either approved or rejected' });
    }

    const [verification] = await db.query(
      'SELECT * FROM Verification WHERE verification_id = ?',
      [req.params.id]
    );

    if (verification.length === 0) {
      return res.status(404).json({ error: 'Verification not found' });
    }

    if (verification[0].status !== 'pending') {
      return res.status(400).json({ error: 'This verification has already been reviewed' });
    }

    await db.query(
      'UPDATE Verification SET status = ?, verified_by = ?, verified_at = NOW() WHERE verification_id = ?',
      [status, req.user.user_id, req.params.id]
    );

    if (status === 'approved') {
      await db.query('UPDATE User SET is_verified = 1 WHERE user_id = ?', [verification[0].user_id]);
    }

    res.json({ message: `Verification ${status} successfully` });
  } catch (err) {
    console.error('Error reviewing verification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DASHBOARD STATS
// ============================================
app.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {};

    if (req.user.role === 'admin') {
      const [userCount] = await db.query('SELECT COUNT(*) as count FROM User');
      const [listingCount] = await db.query('SELECT COUNT(*) as count FROM Listing');
      const [bookingCount] = await db.query('SELECT COUNT(*) as count FROM Booking');
      const [pendingVerifications] = await db.query('SELECT COUNT(*) as count FROM Verification WHERE status = "pending"');
      
      stats.total_users = userCount[0].count;
      stats.total_listings = listingCount[0].count;
      stats.total_bookings = bookingCount[0].count;
      stats.pending_verifications = pendingVerifications[0].count;
    } else if (req.user.role === 'landlord') {
      const [myListings] = await db.query(
        'SELECT COUNT(*) as count FROM Listing WHERE landlord_id = ?',
        [req.user.user_id]
      );
      const [myBookings] = await db.query(
        'SELECT COUNT(*) as count FROM Booking b JOIN Listing l ON b.listing_id = l.listing_id WHERE l.landlord_id = ?',
        [req.user.user_id]
      );
      const [pendingBookings] = await db.query(
        'SELECT COUNT(*) as count FROM Booking b JOIN Listing l ON b.listing_id = l.listing_id WHERE l.landlord_id = ? AND b.status = "pending"',
        [req.user.user_id]
      );
      const [totalRevenue] = await db.query(
        'SELECT COALESCE(SUM(l.price), 0) as total FROM Booking b JOIN Listing l ON b.listing_id = l.listing_id WHERE l.landlord_id = ? AND b.status = "confirmed"',
        [req.user.user_id]
      );
      
      stats.my_listings = myListings[0].count;
      stats.total_bookings = myBookings[0].count;
      stats.pending_bookings = pendingBookings[0].count;
      stats.total_revenue = `KES ${parseFloat(totalRevenue[0].total).toLocaleString()}`;
    } else if (req.user.role === 'student') {
      const [myBookings] = await db.query(
        'SELECT COUNT(*) as count FROM Booking WHERE student_id = ?',
        [req.user.user_id]
      );
      const [availableListings] = await db.query(
        'SELECT COUNT(*) as count FROM Listing WHERE status = "available" AND is_verified = 1'
      );
      const [confirmedBookings] = await db.query(
        'SELECT COUNT(*) as count FROM Booking WHERE student_id = ? AND status = "confirmed"',
        [req.user.user_id]
      );
      const [pendingBookings] = await db.query(
        'SELECT COUNT(*) as count FROM Booking WHERE student_id = ? AND status = "pending"',
        [req.user.user_id]
      );
      
      stats.my_bookings = myBookings[0].count;
      stats.available_listings = availableListings[0].count;
      stats.confirmed_bookings = confirmedBookings[0].count;
      stats.pending_bookings = pendingBookings[0].count;
    }

    res.json(stats);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SEARCH ENDPOINT
// ============================================
app.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const searchTerm = `%${sanitizeInput(q)}%`;

    const [listings] = await db.query(
      `SELECT l.*, u.full_name as landlord_name 
       FROM Listing l 
       JOIN User u ON l.landlord_id = u.user_id 
       WHERE l.is_verified = 1 AND (
         l.title LIKE ? OR 
         l.description LIKE ? OR 
         l.location LIKE ? OR 
         l.amenities LIKE ?
       )
       ORDER BY l.created_at DESC
       LIMIT 20`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );

    res.json(listings);
  } catch (err) {
    console.error('Error searching:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1 + 1 AS result');
    res.json({ 
      message: 'Database connection successful!', 
      result: rows[0].result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Database test error:', err);
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: err.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: 'Riara Accommodation API'
  });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await db.end();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT signal received: closing HTTP server');
  server.close(async () => {
    console.log('HTTP server closed');
    await db.end();
    process.exit(0);
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Riara Accommodation API Server`);
  console.log('='.repeat(60));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  console.log('\nAvailable Endpoints:');
  console.log('  POST   /login');
  console.log('  POST   /register');
  console.log('  GET    /profile');
  console.log('  GET    /listings');
  console.log('  POST   /listings');
  console.log('  GET    /bookings');
  console.log('  POST   /bookings');
  console.log('  GET    /messages');
  console.log('  POST   /messages');
  console.log('  GET    /verifications');
  console.log('  GET    /dashboard/stats');
  console.log('  GET    /test-db');
  console.log('  GET    /health');
  console.log('  POST   /verifications              (Landlord: Submit verification)');
  console.log('  GET    /verifications/my           (Landlord: View my verifications)');
  console.log('  GET    /verifications              (Admin: View pending verifications)');
  console.log('  PUT    /verification/:id/review    (Admin: Review verification)');
  
  console.log('='.repeat(60));
});