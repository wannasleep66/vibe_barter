// tests/unit/moderationService.test.js
const ModerationService = require('../../src/services/ModerationService');
const Advertisement = require('../../src/models/Advertisement');
const AdvertisementReport = require('../../src/models/AdvertisementReport');
const User = require('../../src/models/User');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

describe('ModerationService', () => {
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
    await AdvertisementReport.deleteMany({});
    await Advertisement.deleteMany({});
    await User.deleteMany({});
  });

  describe('reportAdvertisement', () => {
    test('should create a report successfully', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const reporterId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users
      await User.create([
        { 
          _id: ownerId, 
          email: 'owner@example.com', 
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe'
        },
        { 
          _id: reporterId, 
          email: 'reporter@example.com', 
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Smith'
        }
      ]);

      // Create advertisement
      await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // Report the advertisement
      const report = await ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'inappropriate_content',
        details: 'This content is inappropriate'
      }, reporterId);

      expect(report).toBeDefined();
      expect(report.reason).toBe('inappropriate_content');
      expect(report.reporterId.toString()).toBe(reporterId.toString());
      expect(report.advertisementId.toString()).toBe(advertisementId.toString());
      expect(report.status).toBe('pending');
    });

    test('should increment reported count on advertisement', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const reporterId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users and advertisement
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: reporterId, email: 'reporter@example.com', password: 'password123' }
      ]);

      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      expect(advertisement.reportedCount).toBe(0);

      // Report the advertisement
      await ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'spam'
      }, reporterId);

      // Check the updated advertisement
      const updatedAd = await Advertisement.findById(advertisementId);
      expect(updatedAd.reportedCount).toBe(1);
    });

    test('should prevent user from reporting their own advertisement', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create user and advertisement
      await User.create({
        _id: ownerId,
        email: 'owner@example.com',
        password: 'password123'
      });

      await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      await expect(ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'spam'
      }, ownerId)).rejects.toThrow('You cannot report your own advertisement');
    });

    test('should prevent duplicate reports from same user', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const reporterId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users and advertisement
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: reporterId, email: 'reporter@example.com', password: 'password123' }
      ]);

      await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      // First report
      await ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'spam'
      }, reporterId);

      // Second report from same reporter should fail
      await expect(ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'inappropriate_content'
      }, reporterId)).rejects.toThrow('You have already reported this advertisement');
    });
  });

  describe('hideAdvertisement', () => {
    test('should hide an advertisement successfully', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const moderatorId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users and advertisement
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: moderatorId, email: 'moderator@example.com', password: 'password123' }
      ]);

      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      expect(advertisement.isHidden).toBe(false);

      // Hide the advertisement
      const result = await ModerationService.hideAdvertisement(
        advertisementId,
        moderatorId,
        'Contains inappropriate content'
      );

      expect(result.isHidden).toBe(true);
      expect(result.hideReason).toBe('Contains inappropriate content');
      expect(result.hiddenBy.toString()).toBe(moderatorId.toString());
    });
  });

  describe('unhideAdvertisement', () => {
    test('should unhide an advertisement successfully', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const moderatorId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users and hidden advertisement
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: moderatorId, email: 'moderator@example.com', password: 'password123' }
      ]);

      const advertisement = await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true,
        isHidden: true,
        hideReason: 'Incorrectly flagged'
      });

      expect(advertisement.isHidden).toBe(true);

      // Unhide the advertisement
      const result = await ModerationService.unhideAdvertisement(
        advertisementId,
        moderatorId
      );

      expect(result.isHidden).toBe(false);
      expect(result.hideReason).toBeUndefined();
      expect(result.hiddenBy).toBeUndefined();
    });
  });

  describe('reviewReport', () => {
    test('should review a report and hide advertisement if action is hide', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const reporterId = new mongoose.Types.ObjectId();
      const moderatorId = new mongoose.Types.ObjectId();
      const advertisementId = new mongoose.Types.ObjectId();

      // Create users, advertisement and report
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: reporterId, email: 'reporter@example.com', password: 'password123' },
        { _id: moderatorId, email: 'moderator@example.com', password: 'password123' }
      ]);

      await Advertisement.create({
        _id: advertisementId,
        title: 'Test Advertisement',
        description: 'Test description',
        ownerId: ownerId,
        categoryId: new mongoose.Types.ObjectId(),
        type: 'service',
        isActive: true
      });

      const report = await ModerationService.reportAdvertisement({
        advertisementId: advertisementId,
        reason: 'inappropriate_content'
      }, reporterId);

      expect(report.status).toBe('pending');

      // Review the report with hide action
      const reviewedReport = await ModerationService.reviewReport(
        report._id,
        moderatorId,
        'hide',
        'Content violates community guidelines'
      );

      expect(reviewedReport.status).toBe('reviewed');
      expect(reviewedReport.isHidden).toBe(true);
      expect(reviewedReport.reviewedBy.toString()).toBe(moderatorId.toString());

      // Check that the advertisement was hidden
      const hiddenAd = await Advertisement.findById(advertisementId);
      expect(hiddenAd.isHidden).toBe(true);
    });
  });

  describe('getPendingReports', () => {
    test('should return pending reports with pagination', async () => {
      const ownerId = new mongoose.Types.ObjectId();
      const reporterId = new mongoose.Types.ObjectId();
      const advertisementId1 = new mongoose.Types.ObjectId();
      const advertisementId2 = new mongoose.Types.ObjectId();

      // Create users and advertisements
      await User.create([
        { _id: ownerId, email: 'owner@example.com', password: 'password123' },
        { _id: reporterId, email: 'reporter@example.com', password: 'password123' }
      ]);

      await Advertisement.create([
        { _id: advertisementId1, title: 'Ad 1', description: 'Desc 1', ownerId, categoryId: new mongoose.Types.ObjectId(), type: 'service', isActive: true },
        { _id: advertisementId2, title: 'Ad 2', description: 'Desc 2', ownerId, categoryId: new mongoose.Types.ObjectId(), type: 'service', isActive: true }
      ]);

      // Create reports
      await ModerationService.reportAdvertisement({
        advertisementId: advertisementId1,
        reason: 'spam'
      }, reporterId);

      await ModerationService.reportAdvertisement({
        advertisementId: advertisementId2,
        reason: 'inappropriate_content'
      }, reporterId);

      // Get pending reports
      const result = await ModerationService.getPendingReports({ page: 1, limit: 10 });

      expect(result).toBeDefined();
      expect(result.reports).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.reports[0].status).toBe('pending');
    });
  });
});