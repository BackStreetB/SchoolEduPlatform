const { pool } = require('./src/config/database');

async function checkDB() {
  try {
    // Check posts table structure
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'posts' ORDER BY ordinal_position");
    console.log('Posts table columns:', result.rows.map(r => r.column_name));
    
    // Check if comment_count column exists
    const hasCommentCount = result.rows.some(r => r.column_name === 'comment_count');
    console.log('Has comment_count column:', hasCommentCount);
    
    // Check posts data
    const postsResult = await pool.query('SELECT id, content FROM posts ORDER BY id DESC LIMIT 3');
    console.log('Recent posts:', postsResult.rows);
    
    // Check comments count for a specific post
    const commentsResult = await pool.query('SELECT COUNT(*) as count FROM comments WHERE post_id = 22');
    console.log('Comments count for post 22:', commentsResult.rows[0]);
    
    // Check all comments for post 22
    const allCommentsResult = await pool.query('SELECT id, user_id, content, created_at FROM comments WHERE post_id = 22 ORDER BY created_at');
    console.log('All comments for post 22:', allCommentsResult.rows);
    
    // Test the problematic query
    const testQuery = `
      SELECT 
        p.id,
        COUNT(DISTINCT c.id) as comment_count
      FROM posts p
      LEFT JOIN comments c ON p.id = c.post_id
      WHERE p.id = 22
      GROUP BY p.id
    `;
    const testResult = await pool.query(testQuery);
    console.log('Test query result for post 22:', testResult.rows[0]);
    
    // Check if there are any duplicate comments
    const duplicateCheck = await pool.query(`
      SELECT id, COUNT(*) as count 
      FROM comments 
      WHERE post_id = 22 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    console.log('Duplicate comments check:', duplicateCheck.rows);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkDB(); 