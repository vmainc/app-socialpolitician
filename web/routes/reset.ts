import express from 'express';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';

const router = express.Router();

// SQLite database path
const DB_PATH = process.env.POCKETBASE_DB_PATH || '/var/www/voices-of-the-presidency/pocketbase/pb_data/data.db';

/**
 * Delete all messages for a chat using direct SQLite access
 */
async function deleteAllMessages(chatId: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        return reject(err);
      }
    });

    // Delete all messages for this chat
    db.run('DELETE FROM messages WHERE chat = ?', [chatId], function(err) {
      if (err) {
        db.close();
        return reject(err);
      }
      
      const deletedCount = this.changes;
      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr);
        }
        resolve(deletedCount);
      });
    });
  });
}

/**
 * Delete chat record using direct SQLite access
 */
async function deleteChat(chatId: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        return reject(err);
      }
    });

    db.run('DELETE FROM chats WHERE id = ?', [chatId], function(err) {
      if (err) {
        db.close();
        return reject(err);
      }
      
      const deleted = this.changes > 0;
      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing database:', closeErr);
        }
        resolve(deleted);
      });
    });
  });
}

/**
 * Find chat by session_id and president using direct SQLite access
 */
async function findChat(sessionId: string, presidentId: string): Promise<{ id: string } | null> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
      if (err) {
        console.error('Failed to open database:', err);
        return reject(err);
      }
    });

    db.get(
      'SELECT id FROM chats WHERE session_id = ? AND president = ? LIMIT 1',
      [sessionId, presidentId],
      (err, row: any) => {
        db.close((closeErr) => {
          if (closeErr) {
            console.error('Error closing database:', closeErr);
          }
        });
        
        if (err) {
          return reject(err);
        }
        
        resolve(row || null);
      }
    );
  });
}

interface ResetRequest {
  presidentId: string;
  sessionId: string;
}

router.post('/reset-chat', async (req, res) => {
  try {
    const { presidentId, sessionId }: ResetRequest = req.body;

    if (!presidentId || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields: presidentId and sessionId are required' });
    }

    // Find chat by session_id and president using direct SQLite access
    let chat;
    try {
      chat = await findChat(sessionId, presidentId);
      
      if (!chat) {
        // No chat found - return success (nothing to delete)
        return res.json({ 
          success: true, 
          message: 'No chat found to delete',
          messagesDeleted: 0,
          chatDeleted: false
        });
      }
    } catch (error: any) {
      console.error('Error finding chat:', error);
      return res.status(500).json({ 
        error: `Failed to find chat: ${error.message || 'Unknown error'}` 
      });
    }

    // Delete ALL messages for this chat using direct SQLite access
    let messagesDeleted = 0;
    try {
      console.log(`Deleting all messages for chat ${chat.id}...`);
      messagesDeleted = await deleteAllMessages(chat.id);
      console.log(`Deleted ${messagesDeleted} messages`);
    } catch (error: any) {
      console.error('Error deleting messages:', error);
      // Continue to delete chat even if some messages fail
    }

    // Delete the chat record itself using direct SQLite access
    let chatDeleted = false;
    try {
      chatDeleted = await deleteChat(chat.id);
      if (chatDeleted) {
        console.log(`Deleted chat ${chat.id}`);
      }
    } catch (error: any) {
      console.error('Error deleting chat:', error);
      return res.status(500).json({ 
        error: `Failed to delete chat record: ${error.message || 'Unknown error'}`,
        messagesDeleted,
        chatDeleted: false
      });
    }

    // Success - everything deleted
    res.json({ 
      success: true, 
      message: 'Chat and all messages permanently deleted',
      messagesDeleted,
      chatDeleted: true
    });
  } catch (error: any) {
    console.error('Reset chat error:', error);
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: error.response?.data || undefined
    });
  }
});

export default router;
