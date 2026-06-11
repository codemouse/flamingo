import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { PasswordService } from './password.service';
import { User, Role } from './entities/user.entity';

const makePasswordsMock = () => ({
  hash: jest.fn().mockResolvedValue('hashed-pw'),
  verify: jest.fn(),
});

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  username: 'alice',
  email: null,
  passwordHash: 'hashed',
  role: Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<Repository<User>>;
  let passwords: ReturnType<typeof makePasswordsMock>;

  beforeEach(async () => {
    passwords = makePasswordsMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        { provide: PasswordService, useValue: passwords },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('hashes the password and saves the user', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = makeUser();
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create('alice', 'password123');

      expect(passwords.hash).toHaveBeenCalledWith('password123');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'alice',
          passwordHash: 'hashed-pw',
        }),
      );
      expect(result.username).toBe('alice');
    });

    it('throws ConflictException when username is taken', async () => {
      repo.findOne.mockResolvedValue(makeUser());
      await expect(service.create('alice', 'password123')).rejects.toThrow(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('accepts an optional email', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = makeUser({ email: 'alice@example.com' });
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create(
        'alice',
        'password123',
        'alice@example.com',
      );
      expect(result.email).toBe('alice@example.com');
    });
  });

  describe('findByUsername', () => {
    it('returns the user when found', async () => {
      repo.findOne.mockResolvedValue(makeUser());
      const user = await service.findByUsername('alice');
      expect(user?.username).toBe('alice');
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const user = await service.findByUsername('nobody');
      expect(user).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      repo.findOne.mockResolvedValue(makeUser());
      const user = await service.findById('uuid-1');
      expect(user.id).toBe('uuid-1');
    });

    it('throws NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns all users ordered by createdAt ASC', async () => {
      const users = [makeUser(), makeUser({ id: 'uuid-2', username: 'bob' })];
      (repo.find as jest.Mock).mockResolvedValue(users);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
      expect(result).toHaveLength(2);
    });

    it('returns an empty array when there are no users', async () => {
      (repo.find as jest.Mock).mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  describe('adminUpdate', () => {
    it('updates the specified fields and returns the refreshed user', async () => {
      const updated = makeUser({ role: Role.ADMIN });
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updated);

      const result = await service.adminUpdate('uuid-1', { role: Role.ADMIN });

      expect(repo.update).toHaveBeenCalledWith('uuid-1', { role: Role.ADMIN });
      expect(result.role).toBe(Role.ADMIN);
    });

    it('can clear email by setting it to null', async () => {
      const updated = makeUser({ email: null });
      (repo.update as jest.Mock).mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updated);

      const result = await service.adminUpdate('uuid-1', { email: null });
      expect(result.email).toBeNull();
    });

    it('throws NotFoundException when the target user does not exist', async () => {
      (repo.update as jest.Mock).mockResolvedValue({ affected: 0 });
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.adminUpdate('uuid-1', { role: Role.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
