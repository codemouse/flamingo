import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaidItemsService } from './plaid-items.service';
import { PlaidItem } from './entities/plaid-item.entity';

const makeItem = (overrides: Partial<PlaidItem> = {}): PlaidItem =>
  ({
    id: 'pi-1',
    userId: 'user-1',
    itemId: 'item-1',
    accessToken: 'access-token',
    institutionId: null,
    institutionName: null,
    cursor: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as PlaidItem;

describe('PlaidItemsService', () => {
  let service: PlaidItemsService;
  let repo: jest.Mocked<Repository<PlaidItem>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlaidItemsService,
        {
          provide: getRepositoryToken(PlaidItem),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PlaidItemsService);
    repo = module.get(getRepositoryToken(PlaidItem));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates and saves a new PlaidItem with all fields', async () => {
      const built = makeItem({ institutionId: 'ins_1', institutionName: 'A' });
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.create(
        'user-1',
        'item-1',
        'access-token',
        'ins_1',
        'A',
      );

      expect(repo.create).toHaveBeenCalledWith({
        userId: 'user-1',
        itemId: 'item-1',
        accessToken: 'access-token',
        institutionId: 'ins_1',
        institutionName: 'A',
      });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(built);
    });

    it('defaults institutionId and institutionName to null when omitted', async () => {
      const built = makeItem();
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      await service.create('user-1', 'item-1', 'access-token');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          institutionId: null,
          institutionName: null,
        }),
      );
    });
  });

  describe('findByUser', () => {
    it('returns items ordered by createdAt ASC', async () => {
      const items = [makeItem()];
      repo.find.mockResolvedValue(items);
      const result = await service.findByUser('user-1');
      expect(repo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'ASC' },
      });
      expect(result).toBe(items);
    });
  });

  describe('findByItemId', () => {
    it('returns the row when found', async () => {
      const item = makeItem();
      repo.findOne.mockResolvedValue(item);
      expect(await service.findByItemId('item-1')).toBe(item);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { itemId: 'item-1' },
      });
    });

    it('returns null when not found', async () => {
      repo.findOne.mockResolvedValue(null);
      expect(await service.findByItemId('missing')).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the row when found', async () => {
      const item = makeItem();
      repo.findOne.mockResolvedValue(item);
      expect(await service.findById('pi-1')).toBe(item);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('returns all items ordered by createdAt ASC', async () => {
      const items = [makeItem(), makeItem({ id: 'pi-2' })];
      repo.find.mockResolvedValue(items);
      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'ASC' } });
      expect(result).toBe(items);
    });
  });

  describe('updateCursor', () => {
    it('updates the cursor field for the given id', async () => {
      repo.update.mockResolvedValue({ affected: 1 } as never);
      await service.updateCursor('pi-1', 'cursor-123');
      expect(repo.update).toHaveBeenCalledWith('pi-1', {
        cursor: 'cursor-123',
      });
    });
  });

  describe('remove', () => {
    it('deletes when the row exists', async () => {
      repo.delete.mockResolvedValue({ affected: 1 } as never);
      await service.remove('pi-1');
      expect(repo.delete).toHaveBeenCalledWith('pi-1');
    });

    it('logs a warning when the row does not exist but does not throw', async () => {
      repo.delete.mockResolvedValue({ affected: 0 } as never);
      await expect(service.remove('missing')).resolves.toBeUndefined();
    });
  });

  describe('removeByItemId', () => {
    it('deletes by itemId', async () => {
      repo.delete.mockResolvedValue({ affected: 1 } as never);
      await service.removeByItemId('item-1');
      expect(repo.delete).toHaveBeenCalledWith({ itemId: 'item-1' });
    });
  });
});
