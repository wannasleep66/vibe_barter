// tests/unit/chatService.test.js
const ChatService = require('../../src/services/ChatService');
const Chat = require('../../src/models/Chat');
const User = require('../../src/models/User');
const Message = require('../../src/models/Message');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('ChatService', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Chat.deleteMany({});
    await User.deleteMany({});
    await Message.deleteMany({});
  });

  describe('createChat', () => {
    test('should create a new chat successfully', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      const chatData = {
        participants: [userId1, userId2],
        title: 'Test Chat',
        isGroup: false
      };

      const chat = await ChatService.createChat(chatData, userId1);

      expect(chat).toBeDefined();
      expect(chat.participants).toHaveLength(2);
      expect(chat.title).toBe('Test Chat');
      expect(chat.isGroup).toBe(false);
    });

    test('should throw error if creating user is not in participants', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      
      const chatData = {
        participants: [userId1, userId2],
        title: 'Test Chat',
        isGroup: false
      };

      await expect(ChatService.createChat(chatData, otherUserId))
        .rejects
        .toThrow('Creating user must be included in the participants list');
    });

    test('should throw error if chat has less than 2 participants', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      
      const chatData = {
        participants: [userId1],
        title: 'Test Chat',
        isGroup: false
      };

      await expect(ChatService.createChat(chatData, userId1))
        .rejects
        .toThrow('Chat must have at least 2 participants');
    });
  });

  describe('getUserChats', () => {
    test('should return chats for a user', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      // Create a chat with these users
      await Chat.create({
        participants: [userId1, userId2],
        title: 'Test Chat'
      });

      const result = await ChatService.getUserChats(userId1);

      expect(result).toBeDefined();
      expect(result.chats).toHaveLength(1);
      expect(result.chats[0].participants).toContainEqual(userId1);
    });
  });

  describe('getChatById', () => {
    test('should return chat if user is participant', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Test Chat'
      });

      const foundChat = await ChatService.getChatById(chat._id, userId1);

      expect(foundChat).toBeDefined();
      expect(foundChat._id.toString()).toBe(chat._id.toString());
    });

    test('should throw error if user is not participant', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const otherUserId = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Test Chat'
      });

      await expect(ChatService.getChatById(chat._id, otherUserId))
        .rejects
        .toThrow('Chat not found or you are not a participant');
    });
  });

  describe('updateChat', () => {
    test('should update chat title if user is participant', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Old Title'
      });

      const updatedChat = await ChatService.updateChat(
        chat._id,
        userId1,
        { title: 'New Title' }
      );

      expect(updatedChat.title).toBe('New Title');
    });
  });

  describe('deleteChat', () => {
    test('should archive chat if user is participant', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Test Chat'
      });

      expect(chat.isArchived).toBe(false);

      const archivedChat = await ChatService.deleteChat(chat._id, userId1);

      expect(archivedChat.isArchived).toBe(true);
    });
  });

  describe('addParticipant', () => {
    test('should add participant to group chat', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Group Chat',
        isGroup: true
      });

      const updatedChat = await ChatService.addParticipant(chat._id, userId1, userId3);

      expect(updatedChat.participants).toHaveLength(3);
      expect(updatedChat.participants).toContainEqual(userId3);
    });

    test('should not add participant to direct chat', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2],
        title: 'Direct Chat',
        isGroup: false
      });

      await expect(ChatService.addParticipant(chat._id, userId1, userId3))
        .rejects
        .toThrow('Cannot add participants to direct chat');
    });
  });

  describe('removeParticipant', () => {
    test('should remove participant from group chat', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      const userId3 = new mongoose.Types.ObjectId();
      
      const chat = await Chat.create({
        participants: [userId1, userId2, userId3],
        title: 'Group Chat',
        isGroup: true
      });

      expect(chat.participants).toHaveLength(3);

      const updatedChat = await ChatService.removeParticipant(chat._id, userId1, userId2);

      expect(updatedChat.participants).toHaveLength(2);
      expect(updatedChat.participants).not.toContainEqual(userId2);
    });
  });
});