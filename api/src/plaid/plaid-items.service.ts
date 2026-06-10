import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlaidItem } from './entities/plaid-item.entity.js';

@Injectable()
export class PlaidItemsService {
  private readonly logger = new Logger(PlaidItemsService.name);

  constructor(
    @InjectRepository(PlaidItem)
    private readonly repo: Repository<PlaidItem>,
  ) {}

  async create(
    userId: string,
    itemId: string,
    accessToken: string,
    institutionId?: string | null,
    institutionName?: string | null,
  ): Promise<PlaidItem> {
    const item = this.repo.create({
      userId,
      itemId,
      accessToken,
      institutionId: institutionId ?? null,
      institutionName: institutionName ?? null,
    });
    return this.repo.save(item);
  }

  async findByUser(userId: string): Promise<PlaidItem[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  async findByItemId(itemId: string): Promise<PlaidItem | null> {
    return this.repo.findOne({ where: { itemId } });
  }

  async findById(id: string): Promise<PlaidItem> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`PlaidItem ${id} not found`);
    return item;
  }

  async findAll(): Promise<PlaidItem[]> {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async updateCursor(id: string, cursor: string): Promise<void> {
    await this.repo.update(id, { cursor });
  }

  async remove(id: string): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) {
      this.logger.warn(`Attempted to delete non-existent PlaidItem id=${id}`);
    }
  }

  async removeByItemId(itemId: string): Promise<void> {
    await this.repo.delete({ itemId });
  }
}
