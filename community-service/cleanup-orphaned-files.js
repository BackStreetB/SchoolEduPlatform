const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'postgres',
  database: 'school_community',
  password: 'password',
  port: 5432,
});

async function cleanupOrphanedFiles() {
  try {
    console.log('🔍 Bắt đầu dọn dẹp orphaned files...');
    
    // Lấy danh sách files trong database
    const dbResult = await pool.query('SELECT file_name FROM post_media');
    const dbFiles = new Set(dbResult.rows.map(row => row.file_name));
    
    console.log(`📊 Files trong database: ${dbFiles.size}`);
    
    // Lấy danh sách files trên disk
    const uploadsDir = path.join(__dirname, 'uploads');
    const diskFiles = fs.readdirSync(uploadsDir);
    
    console.log(`📁 Files trên disk: ${diskFiles.length}`);
    
    // Tìm orphaned files
    const orphanedFiles = diskFiles.filter(file => !dbFiles.has(file));
    
    console.log(`🗑️  Orphaned files cần xóa: ${orphanedFiles.length}`);
    
    if (orphanedFiles.length === 0) {
      console.log('✅ Không có orphaned files nào!');
      return;
    }
    
    // Hiển thị danh sách orphaned files
    console.log('\n📋 Danh sách orphaned files:');
    orphanedFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${file}`);
    });
    
    // Xóa orphaned files
    console.log('\n🗑️  Đang xóa orphaned files...');
    let deletedCount = 0;
    
    for (const file of orphanedFiles) {
      try {
        const filePath = path.join(uploadsDir, file);
        fs.unlinkSync(filePath);
        console.log(`✅ Đã xóa: ${file}`);
        deletedCount++;
      } catch (error) {
        console.error(`❌ Lỗi xóa ${file}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Hoàn thành! Đã xóa ${deletedCount}/${orphanedFiles.length} files`);
    
    // Kiểm tra lại
    const remainingFiles = fs.readdirSync(uploadsDir).length;
    console.log(`📊 Files còn lại trên disk: ${remainingFiles}`);
    console.log(`📊 Files trong database: ${dbFiles.size}`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

// Chạy cleanup
cleanupOrphanedFiles(); 