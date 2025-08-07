const { pool } = require('../config/database');

class Streak {
  static async getByUserId(userId) {
    try {
      const query = 'SELECT * FROM streaks WHERE user_id = $1';
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async create(userId) {
    try {
      const query = `
        INSERT INTO streaks (user_id, current_streak, longest_streak, last_report_date, streak_start_date)
        VALUES ($1, 0, 0, NULL, NULL)
        RETURNING *
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async updateStreak(userId, reportDate) {
    try {
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // Get current streak
        let streak = await this.getByUserId(userId);
        if (!streak) {
          streak = await this.create(userId);
        }

        const today = new Date();
        const lastReportDate = streak.last_report_date ? new Date(streak.last_report_date) : null;
        const reportDateObj = new Date(reportDate);
        
        let newCurrentStreak = streak.current_streak;
        let newLongestStreak = streak.longest_streak;
        let newStreakStartDate = streak.streak_start_date;

        // Check if this is a consecutive day
        if (lastReportDate) {
          const dayDiff = Math.floor((today - lastReportDate) / (1000 * 60 * 60 * 24));
          
          if (dayDiff === 1) {
            // Consecutive day - increment streak
            newCurrentStreak += 1;
            if (newCurrentStreak > newLongestStreak) {
              newLongestStreak = newCurrentStreak;
            }
          } else if (dayDiff > 1) {
            // Gap in streak - reset to 1
            newCurrentStreak = 1;
            newStreakStartDate = reportDate;
          } else if (dayDiff === 0) {
            // Same day - no change
            return streak;
          }
        } else {
          // First report ever
          newCurrentStreak = 1;
          newStreakStartDate = reportDate;
          if (newCurrentStreak > newLongestStreak) {
            newLongestStreak = newCurrentStreak;
          }
        }

        // Update streak
        const updateQuery = `
          UPDATE streaks 
          SET current_streak = $1, longest_streak = $2, last_report_date = $3, streak_start_date = $4, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $5
          RETURNING *
        `;
        
        const result = await client.query(updateQuery, [
          newCurrentStreak, 
          newLongestStreak, 
          reportDate, 
          newStreakStartDate, 
          userId
        ]);

        await client.query('COMMIT');
        return result.rows[0];
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      throw error;
    }
  }

  static async checkStreakWarning(userId) {
    try {
      const streak = await this.getByUserId(userId);
      if (!streak || !streak.last_report_date) {
        return null;
      }

      const lastReportDate = new Date(streak.last_report_date);
      const today = new Date();
      const hoursSinceLastReport = (today - lastReportDate) / (1000 * 60 * 60);
      
      const warningHours = parseInt(process.env.STREAK_WARNING_HOURS) || 20;
      const resetHours = parseInt(process.env.STREAK_RESET_HOURS) || 24;

      if (hoursSinceLastReport >= warningHours && hoursSinceLastReport < resetHours) {
        return {
          type: 'warning',
          message: `⚠️ Bạn sắp mất streak! Hãy viết báo cáo trong ${Math.ceil(resetHours - hoursSinceLastReport)} giờ nữa để duy trì streak ${streak.current_streak} ngày.`,
          hoursRemaining: Math.ceil(resetHours - hoursSinceLastReport),
          currentStreak: streak.current_streak
        };
      }

      if (hoursSinceLastReport >= resetHours) {
        return {
          type: 'lost',
          message: `😔 Bạn đã mất streak ${streak.current_streak} ngày. Hãy bắt đầu lại ngay hôm nay!`,
          lostStreak: streak.current_streak
        };
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  static async createNotification(userId, type, message) {
    try {
      const query = `
        INSERT INTO streak_notifications (user_id, notification_type, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      
      const result = await pool.query(query, [userId, type, message]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getNotifications(userId, limit = 10) {
    try {
      const query = `
        SELECT * FROM streak_notifications 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      
      const result = await pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  static async markNotificationAsRead(notificationId, userId) {
    try {
      const query = `
        UPDATE streak_notifications 
        SET is_read = true 
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `;
      
      const result = await pool.query(query, [notificationId, userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async getStreakStats(userId) {
    try {
      const streak = await this.getByUserId(userId);
      if (!streak) {
        return {
          currentStreak: 0,
          longestStreak: 0,
          daysSinceLastReport: null,
          isActive: false
        };
      }

      const today = new Date();
      const lastReportDate = streak.last_report_date ? new Date(streak.last_report_date) : null;
      const daysSinceLastReport = lastReportDate ? Math.floor((today - lastReportDate) / (1000 * 60 * 60 * 24)) : null;

      return {
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        daysSinceLastReport,
        isActive: daysSinceLastReport === 0 || daysSinceLastReport === 1,
        streakStartDate: streak.streak_start_date
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Streak; 