"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_service_1 = require("../../../src/services/user.service");
// Mock the users repository before importing the service
jest.mock('../../../src/data/users.repo', () => {
    const mockRepo = {
        create: jest.fn(),
        getByClerkId: jest.fn(),
        update: jest.fn(),
        deactivate: jest.fn(),
        countByTier: jest.fn(),
    };
    return {
        getUsersRepo: jest.fn(() => mockRepo),
        __esModule: true,
    };
});
// Import after mock is set up
const users_repo_1 = require("../../../src/data/users.repo");
describe('User Service - Clerk Event Handlers', () => {
    let userService;
    let mockRepo;
    beforeEach(() => {
        jest.clearAllMocks();
        mockRepo = {
            create: jest.fn(),
            getByClerkId: jest.fn(),
            update: jest.fn(),
            deactivate: jest.fn(),
            countByTier: jest.fn(),
        };
        users_repo_1.getUsersRepo.mockReturnValue(mockRepo);
        userService = new user_service_1.UserService();
    });
    describe('onUserCreated', () => {
        it('should create a user when Clerk user.created event is received', async () => {
            const clerkData = {
                id: 'user_new_123',
                email_addresses: [{ email_address: 'newuser@example.com', primary: true }],
                first_name: 'John',
                last_name: 'Doe',
            };
            mockRepo.getByClerkId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue({
                id: 1,
                clerk_id: 'user_new_123',
                email: 'newuser@example.com',
                name: 'John Doe',
                tier: 'free',
                is_active: true,
                created_at: new Date(),
            });
            const result = await userService.onUserCreated(clerkData);
            expect(mockRepo.create).toHaveBeenCalledWith({
                clerk_id: 'user_new_123',
                email: 'newuser@example.com',
                name: 'John Doe',
                tier: 'free',
            });
            expect(result).toBeDefined();
            expect(result.clerk_id).toBe('user_new_123');
            expect(result.tier).toBe('free');
        });
        it('should extract primary email from email_addresses array', async () => {
            const clerkData = {
                id: 'user_test_456',
                email_addresses: [
                    { email_address: 'old@example.com', primary: false },
                    { email_address: 'primary@example.com', primary: true },
                ],
            };
            mockRepo.getByClerkId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue({
                id: 2,
                clerk_id: 'user_test_456',
                email: 'primary@example.com',
                tier: 'free',
                is_active: true,
                created_at: new Date(),
            });
            await userService.onUserCreated(clerkData);
            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                email: 'primary@example.com',
            }));
        });
        it('should throw error if no primary email exists', async () => {
            const clerkData = {
                id: 'user_no_email',
                email_addresses: [
                    { email_address: 'first@example.com', primary: false },
                    { email_address: 'second@example.com', primary: false },
                ],
            };
            mockRepo.getByClerkId.mockResolvedValue(null);
            await expect(userService.onUserCreated(clerkData)).rejects.toThrow('No primary email');
        });
        it('should set default tier to free on user creation', async () => {
            const clerkData = {
                id: 'user_free_789',
                email_addresses: [{ email_address: 'freeuser@example.com', primary: true }],
            };
            mockRepo.getByClerkId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue({
                id: 3,
                clerk_id: 'user_free_789',
                email: 'freeuser@example.com',
                tier: 'free',
                is_active: true,
                created_at: new Date(),
            });
            const result = await userService.onUserCreated(clerkData);
            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                tier: 'free',
            }));
            expect(result.tier).toBe('free');
        });
        it('should return existing user if already created', async () => {
            const existingUser = {
                id: 1,
                clerk_id: 'user_existing',
                email: 'existing@example.com',
                tier: 'free',
                is_active: true,
            };
            const clerkData = {
                id: 'user_existing',
                email_addresses: [{ email_address: 'existing@example.com', primary: true }],
            };
            mockRepo.getByClerkId.mockResolvedValue(existingUser);
            const result = await userService.onUserCreated(clerkData);
            expect(mockRepo.create).not.toHaveBeenCalled();
            expect(result).toEqual(existingUser);
        });
        it('should include name combining first and last names', async () => {
            const clerkData = {
                id: 'user_full_name',
                email_addresses: [{ email_address: 'fullname@example.com', primary: true }],
                first_name: 'Jane',
                last_name: 'Smith',
            };
            mockRepo.getByClerkId.mockResolvedValue(null);
            mockRepo.create.mockResolvedValue({
                id: 4,
                clerk_id: 'user_full_name',
                email: 'fullname@example.com',
                name: 'Jane Smith',
                tier: 'free',
                is_active: true,
                created_at: new Date(),
            });
            await userService.onUserCreated(clerkData);
            expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Jane Smith',
            }));
        });
    });
    describe('onUserUpdated', () => {
        it('should update user email when email changes', async () => {
            const clerkData = {
                id: 'user_existing_123',
                email_addresses: [{ email_address: 'newemail@example.com', primary: true }],
                first_name: 'John',
            };
            mockRepo.update.mockResolvedValue({
                id: 1,
                clerk_id: 'user_existing_123',
                email: 'newemail@example.com',
                name: 'John',
                tier: 'free',
                is_active: true,
                updated_at: new Date(),
            });
            const result = await userService.onUserUpdated(clerkData);
            expect(mockRepo.update).toHaveBeenCalledWith('user_existing_123', {
                email: 'newemail@example.com',
                name: 'John',
            });
            expect(result.email).toBe('newemail@example.com');
        });
        it('should throw error if no primary email on update', async () => {
            const clerkData = {
                id: 'user_update_error',
                email_addresses: [{ email_address: 'update@example.com', primary: false }],
            };
            await expect(userService.onUserUpdated(clerkData)).rejects.toThrow('No primary email');
        });
    });
    describe('onUserDeleted', () => {
        it('should soft delete user (deactivate)', async () => {
            mockRepo.deactivate.mockResolvedValue(undefined);
            await userService.onUserDeleted('user_to_delete');
            expect(mockRepo.deactivate).toHaveBeenCalledWith('user_to_delete');
        });
        it('should not throw on deletion of non-existent user', async () => {
            mockRepo.deactivate.mockResolvedValue(undefined);
            await expect(userService.onUserDeleted('user_doesnt_exist')).resolves.not.toThrow();
        });
        it('should handle deletion errors', async () => {
            mockRepo.deactivate.mockRejectedValue(new Error('Deletion failed'));
            await expect(userService.onUserDeleted('user_error')).rejects.toThrow('Deletion failed');
        });
    });
});
