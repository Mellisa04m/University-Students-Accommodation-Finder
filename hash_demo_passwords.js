// hash_demo_passwords.js

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Create a connection pool to MySQL
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'student_accommodation_db',
});

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(plain, salt);
}

(async () => {
  const demoPassword = 'password123';
  const hashed = await hashPassword(demoPassword);
  console.log('âœ… Hashed password (copy this if needed):', hashed);

  const connection = await pool.getConnection();
  try {
    // Update every demo user that currently has a placeholder password
    const [result] = await connection.execute(
      `UPDATE User 
       SET password_hash = ? 
       WHERE password_hash LIKE 'hashed_pass_%'`,
      [hashed]
    );

    console.log(`âœ… Updated ${result.affectedRows} demo user(s) with a proper bcrypt hash.`);
  } catch (err) {
    console.error('âŒ Error updating passwords:', err.message);
  } finally {
    connection.release();
    await pool.end();
  }
})()
