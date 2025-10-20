"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const users_repo_1 = require("../../../src/data/users.repo");
describe('Users Repository - Singleton Pattern', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('Repository Singleton Pattern', () => {
        it('should return the same instance on multiple calls', () => {
            const repo1 = (0, users_repo_1.getUsersRepo)();
            const repo2 = (0, users_repo_1.getUsersRepo)();
            expect(repo1).toBe(repo2);
        });
        it('should return UsersRepo instance', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo).toBeInstanceOf(users_repo_1.UsersRepo);
        });
        it('should have required methods', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(typeof repo.create).toBe('function');
            expect(typeof repo.getByClerkId).toBe('function');
            expect(typeof repo.update).toBe('function');
            expect(typeof repo.deactivate).toBe('function');
            expect(typeof repo.countByTier).toBe('function');
        });
    });
    describe('Repository Methods Exist', () => {
        it('should have create method for inserting users', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo.create).toBeDefined();
        });
        it('should have getByClerkId method for querying users by Clerk ID', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo.getByClerkId).toBeDefined();
        });
        it('should have update method for modifying users', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo.update).toBeDefined();
        });
        it('should have deactivate method for soft deleting users', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo.deactivate).toBeDefined();
        });
        it('should have countByTier method for counting users by tier', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            expect(repo.countByTier).toBeDefined();
        });
    });
    describe('Repository Type Safety', () => {
        it('should be properly typed as UsersRepo', () => {
            const repo = (0, users_repo_1.getUsersRepo)();
            // Check that repo has correct structure
            const methods = ['create', 'getByClerkId', 'update', 'deactivate', 'countByTier'];
            methods.forEach((method) => {
                expect(method in repo).toBe(true);
            });
        });
    });
});
