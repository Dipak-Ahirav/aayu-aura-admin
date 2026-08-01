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

function cleanStringList(values: string[] | undefined): string[] | undefined {
  const cleaned = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return cleaned.length ? [...new Set(cleaned)] : undefined;
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
    showInStorefront: product.showInStorefront !== false,
    purchasePriceInPaise: product.purchasePriceInPaise,
    landedCostInPaise: product.landedCostInPaise,
    sellingPriceInPaise: product.sellingPriceInPaise,
    mrpInPaise: product.mrpInPaise,
    offerPriceInPaise: product.offerPriceInPaise,
    currentPhysicalStock: product.currentPhysicalStock,
    reservedStock: product.reservedStock,
    availableStock: Math.max(product.currentPhysicalStock - product.reservedStock, 0),
    reorderLevel: product.reorderLevel,
    hsn: product.hsn,
    gstRate: product.gstRate,
    coverImageUrl: product.coverImageUrl,
    sareeType: product.sareeType,
    fabric: product.fabric,
    primaryColour: product.primaryColour,
    colours: product.colours,
    pattern: product.pattern,
    work: product.work,
    occasion: product.occasion,
    collection: product.collection,
    description: product.description,
    careInstructions: product.careInstructions,
    countryOfOrigin: product.countryOfOrigin,
    sareeLength: product.sareeLength,
    sareeWidth: product.sareeWidth,
    blouseIncluded: product.blouseIncluded,
    blouseDetails: product.blouseDetails,
    taxInformation: product.taxInformation,
    deliveryEstimate: product.deliveryEstimate,
    codAvailable: product.codAvailable,
    returnWindow: product.returnWindow,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    averageRating: product.averageRating,
    reviewCount: product.reviewCount,
    sizeChart: product.sizeChart,
    images: product.images?.map((image, index) => ({
      url: image.url,
      altText: image.altText || product.name,
      sortOrder: image.sortOrder ?? index + 1,
    })),
    videoUrls: product.videoUrls,
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
    showInStorefront: input.showInStorefront ?? true,
    purchasePriceInPaise: input.purchasePriceInPaise,
    landedCostInPaise: input.landedCostInPaise,
    sellingPriceInPaise: input.sellingPriceInPaise,
    mrpInPaise: input.mrpInPaise,
    offerPriceInPaise: input.offerPriceInPaise,
    currentPhysicalStock: input.currentPhysicalStock,
    reservedStock: Math.min(input.reservedStock, input.currentPhysicalStock),
    reorderLevel: input.reorderLevel,
    hsn: cleanEmpty(input.hsn),
    gstRate: input.gstRate,
    coverImageUrl: cleanEmpty(input.coverImageUrl),
    sareeType: cleanEmpty(input.sareeType),
    fabric: cleanEmpty(input.fabric),
    primaryColour: cleanEmpty(input.primaryColour),
    colours: cleanStringList(input.colours),
    pattern: cleanEmpty(input.pattern),
    work: cleanEmpty(input.work),
    occasion: cleanEmpty(input.occasion),
    collection: cleanEmpty(input.collection),
    description: cleanEmpty(input.description),
    careInstructions: cleanEmpty(input.careInstructions),
    countryOfOrigin: cleanEmpty(input.countryOfOrigin),
    sareeLength: cleanEmpty(input.sareeLength),
    sareeWidth: cleanEmpty(input.sareeWidth),
    blouseIncluded: input.blouseIncluded ?? true,
    blouseDetails: cleanEmpty(input.blouseDetails),
    taxInformation: cleanEmpty(input.taxInformation),
    deliveryEstimate: cleanEmpty(input.deliveryEstimate),
    codAvailable: input.codAvailable ?? true,
    returnWindow: cleanEmpty(input.returnWindow),
    isNewArrival: input.isNewArrival ?? false,
    isBestSeller: input.isBestSeller ?? false,
    averageRating: input.averageRating,
    reviewCount: input.reviewCount,
    sizeChart: input.sizeChart,
    images: input.images,
    videoUrls: cleanStringList(input.videoUrls),
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
  if (input.showInStorefront !== undefined) payload.showInStorefront = input.showInStorefront;
  if (input.purchasePriceInPaise !== undefined)
    payload.purchasePriceInPaise = input.purchasePriceInPaise;
  if (input.landedCostInPaise !== undefined) payload.landedCostInPaise = input.landedCostInPaise;
  if (input.sellingPriceInPaise !== undefined)
    payload.sellingPriceInPaise = input.sellingPriceInPaise;
  if (input.mrpInPaise !== undefined) payload.mrpInPaise = input.mrpInPaise;
  if (input.offerPriceInPaise !== undefined) payload.offerPriceInPaise = input.offerPriceInPaise;
  if (input.currentPhysicalStock !== undefined)
    payload.currentPhysicalStock = input.currentPhysicalStock;
  if (input.reservedStock !== undefined) payload.reservedStock = input.reservedStock;
  if (input.reorderLevel !== undefined) payload.reorderLevel = input.reorderLevel;
  if (input.hsn !== undefined) payload.hsn = cleanEmpty(input.hsn);
  if (input.gstRate !== undefined) payload.gstRate = input.gstRate;
  if (input.coverImageUrl !== undefined) payload.coverImageUrl = cleanEmpty(input.coverImageUrl);
  if (input.sareeType !== undefined) payload.sareeType = cleanEmpty(input.sareeType);
  if (input.fabric !== undefined) payload.fabric = cleanEmpty(input.fabric);
  if (input.primaryColour !== undefined) payload.primaryColour = cleanEmpty(input.primaryColour);
  if (input.colours !== undefined) payload.colours = cleanStringList(input.colours);
  if (input.pattern !== undefined) payload.pattern = cleanEmpty(input.pattern);
  if (input.work !== undefined) payload.work = cleanEmpty(input.work);
  if (input.occasion !== undefined) payload.occasion = cleanEmpty(input.occasion);
  if (input.collection !== undefined) payload.collection = cleanEmpty(input.collection);
  if (input.description !== undefined) payload.description = cleanEmpty(input.description);
  if (input.careInstructions !== undefined)
    payload.careInstructions = cleanEmpty(input.careInstructions);
  if (input.countryOfOrigin !== undefined) payload.countryOfOrigin = cleanEmpty(input.countryOfOrigin);
  if (input.sareeLength !== undefined) payload.sareeLength = cleanEmpty(input.sareeLength);
  if (input.sareeWidth !== undefined) payload.sareeWidth = cleanEmpty(input.sareeWidth);
  if (input.blouseIncluded !== undefined) payload.blouseIncluded = input.blouseIncluded;
  if (input.blouseDetails !== undefined) payload.blouseDetails = cleanEmpty(input.blouseDetails);
  if (input.taxInformation !== undefined) payload.taxInformation = cleanEmpty(input.taxInformation);
  if (input.deliveryEstimate !== undefined)
    payload.deliveryEstimate = cleanEmpty(input.deliveryEstimate);
  if (input.codAvailable !== undefined) payload.codAvailable = input.codAvailable;
  if (input.returnWindow !== undefined) payload.returnWindow = cleanEmpty(input.returnWindow);
  if (input.isNewArrival !== undefined) payload.isNewArrival = input.isNewArrival;
  if (input.isBestSeller !== undefined) payload.isBestSeller = input.isBestSeller;
  if (input.averageRating !== undefined) payload.averageRating = input.averageRating;
  if (input.reviewCount !== undefined) payload.reviewCount = input.reviewCount;
  if (input.sizeChart !== undefined) payload.sizeChart = input.sizeChart;
  if (input.images !== undefined) payload.images = input.images;
  if (input.videoUrls !== undefined) payload.videoUrls = cleanStringList(input.videoUrls);
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

  async addImages(
    id: string,
    images: NonNullable<ProductDocument['images']>,
    userId?: string,
  ): Promise<AdminProductDto> {
    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product was not found.');
    }
    const previous = toDto(product);
    const existingImages = product.images ?? [];
    const nextImages = [...existingImages, ...images].map((image, index) => ({
      ...image,
      sortOrder: image.sortOrder ?? index + 1,
    }));
    product.images = nextImages;
    product.coverImageUrl = product.coverImageUrl || nextImages[0]?.url;
    await product.save();
    const dto = toDto(product);
    await recordAudit({
      module: 'Products',
      action: 'Upload product images',
      entity: 'Product',
      entityId: dto.id,
      userId,
      previousValue: previous as unknown as Record<string, unknown>,
      newValue: dto as unknown as Record<string, unknown>,
    });
    return dto;
  }
}
