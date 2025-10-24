import { SessionsService } from '../../../src/services/sessions.service';
import { SessionsRepo } from '../../../src/data/sessions.repo';
import { AppError } from '../../../src/errors';

// Mock the repository
jest.mock('../../../src/data/sessions.repo');

describe('SessionsService - Overlap Detection', () => {
  let service: SessionsService;
  let mockRepo: jest.Mocked<SessionsRepo>;

  beforeEach(() => {
    mockRepo = new SessionsRepo() as jest.Mocked<SessionsRepo>;
    service = new SessionsService();
    (service as any).repo = mockRepo;
    jest.clearAllMocks();
  });

  describe('create with overlap check', () => {
    it('should create session successfully when no overlap exists', async () => {
      const payload = {
        venue_id: 1,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
      };

      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([]);
      mockRepo.create = jest.fn().mockResolvedValue({ id: 1, ...payload });

      const result = await service.create(payload);

      expect(mockRepo.findOverlappingSessions).toHaveBeenCalledWith(
        1,
        '2025-10-25T10:00:00Z',
        '2025-10-25T12:00:00Z',
        undefined
      );
      expect(mockRepo.create).toHaveBeenCalledWith(payload);
      expect(result.id).toBe(1);
    });

    it('should throw SESSION_CONFLICT error when overlap exists', async () => {
      const payload = {
        venue_id: 1,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
      };

      const overlappingSession = {
        id: 99,
        pitch_id: 1,
        start_ts: '2025-10-25T11:00:00Z',
        end_ts: '2025-10-25T13:00:00Z',
      };

      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([overlappingSession]);

      await expect(service.create(payload)).rejects.toThrow(AppError);
      await expect(service.create(payload)).rejects.toMatchObject({
        status: 409,
        code: 'SESSION_CONFLICT',
      });

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('should skip overlap check when pitch_id is null', async () => {
      const payload = {
        venue_id: 1,
        pitch_id: null,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
      };

      mockRepo.findOverlappingSessions = jest.fn();
      mockRepo.create = jest.fn().mockResolvedValue({ id: 1, ...payload });

      await service.create(payload);

      expect(mockRepo.findOverlappingSessions).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(payload);
    });

    it('should skip overlap check when times are missing', async () => {
      const payload = {
        venue_id: 1,
        pitch_id: 1,
        start_ts: undefined,
        end_ts: undefined,
      };

      mockRepo.findOverlappingSessions = jest.fn();
      mockRepo.create = jest.fn().mockResolvedValue({ id: 1, ...payload });

      await service.create(payload);

      expect(mockRepo.findOverlappingSessions).not.toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(payload);
    });
  });

  describe('update with overlap check', () => {
    it('should update session successfully when no overlap exists', async () => {
      const sessionId = 1;
      const ifMatch = 'version-token-123';
      const payload = {
        pitch_id: 1,
        start_ts: '2025-10-25T14:00:00Z',
        end_ts: '2025-10-25T16:00:00Z',
      };

      const existingSession = {
        id: sessionId,
        venue_id: 1,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
        version_token: ifMatch,
      };

      mockRepo.getById = jest.fn().mockResolvedValue(existingSession);
      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([]);
      mockRepo.update = jest.fn().mockResolvedValue({ ...existingSession, ...payload });

      const result = await service.update(sessionId, ifMatch, payload);

      expect(mockRepo.findOverlappingSessions).toHaveBeenCalledWith(
        1,
        '2025-10-25T14:00:00Z',
        '2025-10-25T16:00:00Z',
        sessionId
      );
      expect(mockRepo.update).toHaveBeenCalledWith(sessionId, payload);
    });

    it('should throw SESSION_CONFLICT when updating creates overlap', async () => {
      const sessionId = 1;
      const ifMatch = 'version-token-123';
      const payload = {
        start_ts: '2025-10-25T11:00:00Z', // Overlaps with existing session
        end_ts: '2025-10-25T13:00:00Z',
      };

      const existingSession = {
        id: sessionId,
        venue_id: 1,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
        version_token: ifMatch,
      };

      const overlappingSession = {
        id: 99,
        pitch_id: 1,
        start_ts: '2025-10-25T12:00:00Z',
        end_ts: '2025-10-25T14:00:00Z',
      };

      mockRepo.getById = jest.fn().mockResolvedValue(existingSession);
      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([overlappingSession]);

      await expect(service.update(sessionId, ifMatch, payload)).rejects.toThrow(AppError);
      await expect(service.update(sessionId, ifMatch, payload)).rejects.toMatchObject({
        status: 409,
        code: 'SESSION_CONFLICT',
      });

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should throw CONFLICT error for stale version token', async () => {
      const sessionId = 1;
      const ifMatch = 'stale-token';
      const payload = { notes: 'Updated notes' };

      const existingSession = {
        id: sessionId,
        venue_id: 1,
        pitch_id: 1,
        version_token: 'current-token',
      };

      mockRepo.getById = jest.fn().mockResolvedValue(existingSession);

      await expect(service.update(sessionId, ifMatch, payload)).rejects.toThrow(AppError);
      await expect(service.update(sessionId, ifMatch, payload)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });

      expect(mockRepo.findOverlappingSessions).not.toHaveBeenCalled();
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('should use current values when payload does not override', async () => {
      const sessionId = 1;
      const ifMatch = 'version-token-123';
      const payload = {
        notes: 'Updated notes',
        // pitch_id, start_ts, end_ts not in payload
      };

      const existingSession = {
        id: sessionId,
        venue_id: 1,
        pitch_id: 2,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
        version_token: ifMatch,
      };

      mockRepo.getById = jest.fn().mockResolvedValue(existingSession);
      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([]);
      mockRepo.update = jest.fn().mockResolvedValue({ ...existingSession, ...payload });

      await service.update(sessionId, ifMatch, payload);

      // Should check overlap with existing pitch and times
      expect(mockRepo.findOverlappingSessions).toHaveBeenCalledWith(
        2,
        '2025-10-25T10:00:00Z',
        '2025-10-25T12:00:00Z',
        sessionId
      );
    });

    it('should allow updating pitch to null (no overlap check)', async () => {
      const sessionId = 1;
      const ifMatch = 'version-token-123';
      const payload = {
        pitch_id: null, // Unassign from pitch
      };

      const existingSession = {
        id: sessionId,
        venue_id: 1,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
        version_token: ifMatch,
      };

      mockRepo.getById = jest.fn().mockResolvedValue(existingSession);
      mockRepo.findOverlappingSessions = jest.fn();
      mockRepo.update = jest.fn().mockResolvedValue({ ...existingSession, ...payload });

      await service.update(sessionId, ifMatch, payload);

      // No overlap check when pitch becomes null
      expect(mockRepo.findOverlappingSessions).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(sessionId, payload);
    });
  });

  describe('overlap detection edge cases', () => {
    it('should detect exact time overlap', async () => {
      const payload = {
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
      };

      const overlappingSession = {
        id: 99,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z', // Exact same start
        end_ts: '2025-10-25T12:00:00Z',   // Exact same end
      };

      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([overlappingSession]);

      await expect(service.create(payload)).rejects.toThrow(AppError);
    });

    it('should detect partial overlap (new session starts during existing)', async () => {
      const payload = {
        pitch_id: 1,
        start_ts: '2025-10-25T11:00:00Z', // Starts during existing
        end_ts: '2025-10-25T13:00:00Z',   // Ends after existing
      };

      const overlappingSession = {
        id: 99,
        pitch_id: 1,
        start_ts: '2025-10-25T10:00:00Z',
        end_ts: '2025-10-25T12:00:00Z',
      };

      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([overlappingSession]);

      await expect(service.create(payload)).rejects.toThrow(AppError);
    });

    it('should allow back-to-back sessions (no gap)', async () => {
      const payload = {
        pitch_id: 1,
        start_ts: '2025-10-25T12:00:00Z', // Starts exactly when previous ends
        end_ts: '2025-10-25T14:00:00Z',
      };

      mockRepo.findOverlappingSessions = jest.fn().mockResolvedValue([]);
      mockRepo.create = jest.fn().mockResolvedValue({ id: 1, ...payload });

      await service.create(payload);

      expect(mockRepo.create).toHaveBeenCalled();
    });
  });
});
