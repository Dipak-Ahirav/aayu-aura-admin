import { Types } from 'mongoose';
import type { AdminProductDto } from '@aayu-aura/shared-types';
import { recordAudit } from '../audit-logs/audit-recorder.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { ProductModel, type ProductDocument } from './product.model.js';
import type { CreateProductInput, UpdateProductInput } from './product.schemas.js';

function cleanEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeSku(sku: string): string {
  return sku.trim().toUpperCase();
}

function toDto(product: ProductDocument & { _id: Types.ObjectId }): AdminProductDto {
  return {
    id: product._id.toString(),
    name: product.name,
    sku: product.sku,
    category: product.category,
    status: product.status,
    purchasePriceInPaise: product.purchasePriceInPaise,
    landedCostInPaise: product.landedCostInPaise,
    sellingPriceInPaise: product.sellingPriceInPaise,
    currentPhysicalStock: product.currentPhysicalStock,
    reservedStock: product.reservedStock,
    availableStock: Math.max(product.currentPhysicalStock - product.reservedStock, 0),
    reorderLevel: product.reorderLevel,
    hsn: product.hsn,
    gstRate: product.gstRate,
    coverImageUrl: product.coverImageUrl,
    internalNotes: product.internalNotes,
    createdAt: product.createdAt.toISOString(),
  };
}

function createPayload(input: CreateProductInput, userId?: string) {
  return {
    name: input.name.trim(),
    sku: normalizeSku(input.sku),
    category: cleanEmpty(input.category),
    status: input.status,
    purchasePriceInPaise: input.purchasePriceInPaise,
    landedCostInPaise: input.landedCostInPaise,
    sellingPriceInPaise: input.sellingPriceInPaise,
    currentPhysicalStock: input.currentPhysicalStock,
    reservedStock: Math.min(input.reservedStock, input.currentPhysicalStock),
    reorderLevel: input.reorderLevel,
    hsn: cleanEmpty(input.hsn),
    gstRate: input.gstRate,
    coverImageUrl: cleanEmpty(input.coverImageUrl),
    internalNotes: cleanEmpty(input.internalNotes),
    createdBy: userId ? new Types.ObjectId(userId) : undefined,
  };
}

function updatePayload(input: UpdateProductInput) {
  const payload: Partial<ProductDocument> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.sku !== undefined) payload.sku = normalizeSku(input.sku);
  if (input.category !== undefined) payload.category = cleanEmpty(input.category);
  if (input.status !== undefined) payload.status = input.status;
  if (input.purchasePriceInPaise !== undefined)
    payload.purchasePriceInPaise = input.purchasePriceInPaise;
  if (input.landedCostInPaise !== undefined) payload.landedCostInPaise = input.landedCostInPaise;
  if (input.sellingPriceInPaise !== undefined)
    payload.sellingPriceInPaise = input.sellingPriceInPaise;
  if (input.currentPhysicalStock !== undefined)
    payload.currentPhysicalStock = input.currentPhysicalStock;
  if (input.reservedStock !== undefined) payload.reservedStock = input.reservedStock;
  if (input.reorderLevel !== undefined) payload.reorderLevel = input.reorderLevel;
  if (input.hsn !== undefined) payload.hsn = cleanEmpty(input.hsn);
  if (input.gstRate !== undefined) payload.gstRate = input.gstRate;
  if (input.coverImageUrl !== undefined) payload.coverImageUrl = cleanEmpty(input.coverImageUrl);
  if (input.internalNotes !== undefined) payload.internalNotes = cleanEmpty(input.internalNotes);
  return payload;
}

export class ProductService {
  async create(input: CreateProductInput, userId?: string): Promise<AdminProductDto> {
    const existing = await ProductModel.findOne({ sku: normalizeSku(input.sku) });
    if (existing) {
      throw new AppError(409, 'PRODUCT_SKU_EXISTS', 'A product with this SKU already exists.');
    }

    const product = await ProductModel.create(createPayload(input, userId));
    const dto = toDto(product);
    await recordAudit({
      module: 'Products',
      action: 'Create product',
      entity: 'Product',
      entityId: dto.id,
      userId,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }

  async list(): Promise<AdminProductDto[]> {
    const products = await ProductModel.find().sort({ createdAt: -1 }).limit(100);
    return products.map((product) => toDto(product));
  }

  async update(id: string, input: UpdateProductInput, userId?: string): Promise<AdminProductDto> {
    const existing = await ProductModel.findById(id);
    if (!existing) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    const previous = toDto(existing);
    const payload = updatePayload(input);
    if (payload.currentPhysicalStock !== undefined && payload.reservedStock !== undefined) {
      payload.reservedStock = Math.min(payload.reservedStock, payload.currentPhysicalStock);
    }

    const product = await ProductModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }

    if (product.reservedStock > product.currentPhysicalStock) {
      product.reservedStock = product.currentPhysicalStock;
      await product.save();
    }

    const dto = toDto(product);
    await recordAudit({
      module: 'Products',
      action: 'Update product',
      entity: 'Product',
      entityId: dto.id,
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }
}
