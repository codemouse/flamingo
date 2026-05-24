import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { UsersService } from '../users/users.service';
import { User, Role } from '../users/entities/user.entity';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'uuid-1',
  username: 'alice',
  email: null,
  passwordHash: 'should-never-be-returned',
  role: Role.USER,
  yodleeLoginName: 'sbMem68c09b712b5831',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('AdminController', () => {
  let controller: AdminController;
  let usersService: jest.Mocked<Pick<UsersService, 'findAll' | 'adminUpdate'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            adminUpdate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('sbMem1,sbMem2,sbMem3'),
          },
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    usersService = module.get(UsersService);
    configService = module.get(ConfigService);
  });

  // ── getAllUsers ───────────────────────────────────────────────────────────

  describe('getAllUsers', () => {
    it('returns all users with passwordHash stripped', async () => {
      const users = [makeUser(), makeUser({ id: 'uuid-2', username: 'bob', role: Role.ADMIN })];
      (usersService.findAll as jest.Mock).mockResolvedValue(users);

      const result = await controller.getAllUsers();

      expect(result).toHaveLength(2);
      result.forEach((u) => expect(u).not.toHaveProperty('passwordHash'));
    });

    it('returns an empty array when there are no users', async () => {
      (usersService.findAll as jest.Mock).mockResolvedValue([]);
      expect(await controller.getAllUsers()).toEqual([]);
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('updates role and strips passwordHash from the response', async () => {
      const updated = makeUser({ role: Role.ADMIN });
      (usersService.adminUpdate as jest.Mock).mockResolvedValue(updated);

      const dto: UpdateUserAdminDto = { role: Role.ADMIN };
      const result = await controller.updateUser('uuid-1', dto);

      expect(usersService.adminUpdate).toHaveBeenCalledWith('uuid-1', { role: Role.ADMIN });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result.role).toBe(Role.ADMIN);
    });

    it('updates yodleeLoginName and does not include undefined fields', async () => {
      const updated = makeUser({ yodleeLoginName: 'sbMem68c09b712b5832' });
      (usersService.adminUpdate as jest.Mock).mockResolvedValue(updated);

      const dto: UpdateUserAdminDto = { yodleeLoginName: 'sbMem68c09b712b5832' };
      await controller.updateUser('uuid-1', dto);

      // role is undefined so should not be passed
      expect(usersService.adminUpdate).toHaveBeenCalledWith('uuid-1', {
        yodleeLoginName: 'sbMem68c09b712b5832',
      });
    });

    it('passes null yodleeLoginName to unlink an account', async () => {
      const updated = makeUser({ yodleeLoginName: null });
      (usersService.adminUpdate as jest.Mock).mockResolvedValue(updated);

      const dto: UpdateUserAdminDto = { yodleeLoginName: null };
      await controller.updateUser('uuid-1', dto);

      expect(usersService.adminUpdate).toHaveBeenCalledWith('uuid-1', { yodleeLoginName: null });
    });
  });

  // ── getSandboxPool ────────────────────────────────────────────────────────

  describe('getSandboxPool', () => {
    it('splits the comma-separated env var and returns trimmed entries', () => {
      configService.get.mockReturnValue('sbMem1, sbMem2,  sbMem3 ');
      expect(controller.getSandboxPool()).toEqual({ pool: ['sbMem1', 'sbMem2', 'sbMem3'] });
    });

    it('returns an empty pool when the env var is empty', () => {
      configService.get.mockReturnValue('');
      expect(controller.getSandboxPool()).toEqual({ pool: [] });
    });
  });
});
