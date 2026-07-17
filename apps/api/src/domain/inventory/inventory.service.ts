import { Types, type SortOrder } from 'mongoose';
import type {
  InventoryListDto,
  InventoryStockItemDto,
  InventoryStockStatus,
  InventorySummaryDto,
  StockMovementDto,
} from '@aayu-aura/shared-types';
import { AppError } from '../../infrastructure/http/app-error.js';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { ProductModel, type ProductDocument } from '../products/product.model.js';
import { StockMovementModel, type StockMovementDocument } from './stock-movement.model.js';
import type {
  CreateStockMovementInput,
  InventoryQueryInput,
  UpdateStockMovementInput,
} from './inventory.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function stockStatus(availableStock: number, reorderLevel = 0): InventoryStockStatus {
  if (availableStock <= 0) return 'out_of_stock';
  if (availableStock <= reorderLevel) return 'low_stock';
  return 'in_stock';
}

function productToStockItem(
  product: ProductDocument & { _id: Types.ObjectId },
): InventoryStockItemDto {
  const availableStock = Math.max(product.currentPhysicalStock - product.reservedStock, 0);
  const reorderLevel = product.reorderLevel ?? 0;
  return {
    productId: product._id.toString(),
    name: product.name,
    sku: product.sku,
    category: product.category,
    physicalStock: product.currentPhysicalStock,
    reservedStock: product.reservedStock,
    availableStock,
    reorderLevel,
    damagedStock: 0,
    returnedStock: 0,
    stockStatus: stockStatus(availableStock, reorderLevel),
    updatedAt: product.updatedAt?.toISOString(),
  };
}

function movementToDto(
  movement: StockMovementDocument & { _id: Types.ObjectId },
): StockMovementDto {
  return {
    id: movement._id.toString(),
    productId: movement.productId.toString(),
    productName: movement.productName,
    sku: movement.sku,
    warehouse: movement.warehouse,
    movementType: movement.movementType,
    direction: movement.direction,
    quantity: movement.quantity,
    previousPhysicalStock: movement.previousPhysicalStock,
    newPhysicalStock: movement.newPhysicalStock,
    previousReservedStock: movement.previousReservedStock,
    newReservedStock: movement.newReservedStock,
    reason: movement.reason,
    reference: movement.reference,
    notes: movement.notes,
    createdAt: movement.createdAt.toISOString(),
  };
}

function productFilter(input: InventoryQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  if (input.segment === 'reservations') {
    filter['reservedStock'] = { $gt: 0 };
  }

  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [{ name: search }, { sku: search }, { category: search }];
  }

  return filter;
}

function productSort(input: InventoryQueryInput): Record<string, SortOrder> {
  if (input.sort === 'name_desc') return { name: -1 };
  if (input.sort === 'available_asc') return { currentPhysicalStock: 1 };
  if (input.sort === 'available_desc') return { currentPhysicalStock: -1 };
  if (input.sort === 'newest') return { createdAt: -1 };
  return { name: 1 };
}

function movementFilter(input: InventoryQueryInput): Record<string, unknown> {
  const filter: Record<string, unknown> = { reversedAt: { $exists: false } };
  if (input.warehouse !== 'all') filter['warehouse'] = input.warehouse;
  if (input.search) {
    const search = new RegExp(input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter['$or'] = [
      { productName: search },
      { sku: search },
      { reason: search },
      { reference: search },
    ];
  }
  return filter;
}

function filterByStatus(
  products: Array<ProductDocument & { _id: Types.ObjectId }>,
  input: InventoryQueryInput,
) {
  if (input.stockStatus === 'all' && input.segment !== 'low_stock') return products;
  return products.filter((product) => {
    const item = productToStockItem(product);
    if (input.segment === 'low_stock') return item.stockStatus === 'low_stock';
    return item.stockStatus === input.stockStatus;
  });
}

function buildSummary(
  products: Array<ProductDocument & { _id: Types.ObjectId }>,
  movementsToday: number,
  transactions: number,
): InventorySummaryDto {
  const items = products.map(productToStockItem);
  return {
    availableStock: items.reduce((sum, item) => sum + item.availableStock, 0),
    reservedStock: items.reduce((sum, item) => sum + item.reservedStock, 0),
    damagedStock: 0,
    movementsToday,
    totalProducts: items.length,
    lowStock: items.filter((item) => item.stockStatus === 'low_stock').length,
    transactions,
    reservations: items.filter((item) => item.reservedStock > 0).length,
  };
}

export class InventoryService {
  async list(input: InventoryQueryInput): Promise<InventoryListDto> {
    const allProducts = await ProductModel.find(productFilter({ ...input, segment: 'all' }));
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const movementBaseFilter = movementFilter(input);
    const [movementsToday, transactionCount] = await Promise.all([
      StockMovementModel.countDocuments({
        reversedAt: { $exists: false },
        createdAt: { $gte: startOfToday },
      }),
      StockMovementModel.countDocuments(movementBaseFilter),
    ]);
    const summary = buildSummary(allProducts, movementsToday, transactionCount);

    if (input.segment === 'transactions') {
      const movements = await StockMovementModel.find(movementBaseFilter)
        .sort({ createdAt: -1 })
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize);
      return {
        stockItems: [],
        movements: movements.map((movement) => movementToDto(movement)),
        total: transactionCount,
        page: input.page,
        pageSize: input.pageSize,
        summary,
      };
    }

    const products = filterByStatus(
      await ProductModel.find(productFilter(input)).sort(productSort(input)),
      input,
    );
    const total = products.length;
    const paged = products.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
    const recentMovements = await StockMovementModel.find(movementBaseFilter)
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      stockItems: paged.map(productToStockItem),
      movements: recentMovements.map((movement) => movementToDto(movement)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      summary,
    };
  }

  async createMovement(
    input: CreateStockMovementInput,
    userId?: string,
  ): Promise<StockMovementDto> {
    const product = await ProductModel.findById(input.productId);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }

    const previousPhysicalStock = product.currentPhysicalStock;
    const previousReservedStock = product.reservedStock;
    let newPhysicalStock = previousPhysicalStock;
    let newReservedStock = previousReservedStock;

    if (input.movementType === 'reservation') {
      if (input.quantity > Math.max(previousPhysicalStock - previousReservedStock, 0)) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', 'Available stock is not enough to reserve.');
      }
      newReservedStock += input.quantity;
    } else if (input.movementType === 'release') {
      if (input.quantity > previousReservedStock) {
        throw new AppError(400, 'INVALID_RELEASE', 'Release quantity is more than reserved stock.');
      }
      newReservedStock -= input.quantity;
    } else if (input.direction === 'in') {
      newPhysicalStock += input.quantity;
    } else {
      if (input.quantity > previousPhysicalStock) {
        throw new AppError(400, 'INSUFFICIENT_STOCK', 'Physical stock is not enough.');
      }
      newPhysicalStock -= input.quantity;
      newReservedStock = Math.min(newReservedStock, newPhysicalStock);
    }

    product.currentPhysicalStock = newPhysicalStock;
    product.reservedStock = newReservedStock;
    await product.save();

    const movement = await StockMovementModel.create({
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      warehouse: cleanEmpty(input.warehouse),
      movementType: input.movementType,
      direction: input.direction,
      quantity: input.quantity,
      previousPhysicalStock,
      newPhysicalStock,
      previousReservedStock,
      newReservedStock,
      reason: cleanEmpty(input.reason),
      reference: cleanEmpty(input.reference),
      notes: cleanEmpty(input.notes),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    const dto = movementToDto(movement);
    await recordAudit({
      module: 'Inventory',
      action: 'Create stock movement',
      entity: 'StockMovement',
      entityId: dto.id,
      userId,
      previousValue: {
        productId: product._id.toString(),
        physicalStock: previousPhysicalStock,
        reservedStock: previousReservedStock,
      },
      newValue: {
        productId: product._id.toString(),
        physicalStock: newPhysicalStock,
        reservedStock: newReservedStock,
      },
      severity: input.movementType === 'damage' ? 'Warning' : 'Info',
      metadata: { movementType: input.movementType, direction: input.direction },
    });
    return dto;
  }

  async updateMovement(
    id: string,
    input: UpdateStockMovementInput,
    userId?: string,
  ): Promise<StockMovementDto> {
    const existing = await StockMovementModel.findOne({ _id: id, reversedAt: { $exists: false } });
    if (!existing) {
      throw new AppError(404, 'STOCK_MOVEMENT_NOT_FOUND', 'Stock movement was not found.');
    }
    const previous = movementToDto(existing);
    const movement = await StockMovementModel.findOneAndUpdate(
      { _id: id, reversedAt: { $exists: false } },
      {
        $set: {
          warehouse: cleanEmpty(input.warehouse),
          reason: cleanEmpty(input.reason),
          reference: cleanEmpty(input.reference),
          notes: cleanEmpty(input.notes),
        },
      },
      { new: true },
    );
    if (!movement) {
      throw new AppError(404, 'STOCK_MOVEMENT_NOT_FOUND', 'Stock movement was not found.');
    }
    const dto = movementToDto(movement);
    await recordAudit({
      module: 'Inventory',
      action: 'Update stock movement',
      entity: 'StockMovement',
      entityId: dto.id,
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }

  async reverseMovement(id: string, userId?: string): Promise<StockMovementDto> {
    const movement = await StockMovementModel.findOne({ _id: id, reversedAt: { $exists: false } });
    if (!movement) {
      throw new AppError(404, 'STOCK_MOVEMENT_NOT_FOUND', 'Stock movement was not found.');
    }

    const product = await ProductModel.findById(movement.productId);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }

    product.currentPhysicalStock = movement.previousPhysicalStock;
    product.reservedStock = movement.previousReservedStock;
    await product.save();
    movement.reversedAt = new Date();
    await movement.save();

    const dto = movementToDto(movement);
    await recordAudit({
      module: 'Inventory',
      action: 'Reverse stock movement',
      entity: 'StockMovement',
      entityId: dto.id,
      userId,
      previousValue: {
        productId: product._id.toString(),
        physicalStock: dto.newPhysicalStock,
        reservedStock: dto.newReservedStock,
      },
      newValue: {
        productId: product._id.toString(),
        physicalStock: product.currentPhysicalStock,
        reservedStock: product.reservedStock,
      },
      severity: 'Warning',
    });
    return dto;
  }
}
