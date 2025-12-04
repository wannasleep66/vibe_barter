// src/routes/chats.js
const express = require('express');
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { 
  requirePermissions,
  isOwnResourceOrAdmin 
} = require('../middleware/rbac');
const {
  validateCreateChat,
  validateUpdateChat,
  validateAddParticipant,
  validateRemoveParticipant,
  validateChatId,
  validateGetChatsQuery
} = require('../middleware/validation/chatValidation');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// GET /api/chats - Get all chats for authenticated user
router.get('/', 
  requirePermissions('chat.read'),
  validateGetChatsQuery,
  chatController.getUserChats
);

// POST /api/chats - Create a new chat
router.post('/',
  requirePermissions('chat.create'),
  validateCreateChat,
  chatController.createChat
);

// GET /api/chats/:id - Get a specific chat by ID
router.get('/:id',
  requirePermissions('chat.read'),
  validateChatId,
  chatController.getChatById
);

// PATCH /api/chats/:id - Update chat information
router.patch('/:id',
  requirePermissions('chat.update'),
  validateChatId,
  validateUpdateChat,
  chatController.updateChat
);

// DELETE /api/chats/:id - Archive/delete a chat
router.delete('/:id',
  requirePermissions('chat.delete'),
  validateChatId,
  chatController.deleteChat
);

// POST /api/chats/:id/archive - Archive a chat
router.post('/:id/archive',
  requirePermissions('chat.update'),
  validateChatId,
  chatController.archiveChat
);

// POST /api/chats/:id/unarchive - Unarchive a chat
router.post('/:id/unarchive',
  requirePermissions('chat.update'),
  validateChatId,
  chatController.unarchiveChat
);

// POST /api/chats/:id/restore - Restore a deleted chat
router.post('/:id/restore',
  requirePermissions('chat.update'),
  validateChatId,
  chatController.restoreChat
);

// POST /api/chats/:chatId/participants/add - Add participant to chat
router.post('/:chatId/participants/add',
  requirePermissions('chat.update'),
  validateChatId,
  validateAddParticipant,
  chatController.addParticipant
);

// DELETE /api/chats/:chatId/participants/remove - Remove participant from chat
router.delete('/:chatId/participants/remove',
  requirePermissions('chat.update'),
  validateChatId,
  validateRemoveParticipant,
  chatController.removeParticipant
);

module.exports = router;