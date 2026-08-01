import type { RequestHandler } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { ok } from '../../infrastructure/http/api-response.js';
import { AppError } from '../../infrastructure/http/app-error.js';
import { createProductSchema, updateProductSchema } from './product.schemas.js';
import { ProductService } from './product.service.js';
import { storedProductImageUrl } from './product-image-url.js';

const productService = new ProductService();
const uploadDir = path.resolve(process.cwd(), 'uploads', 'products');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeName = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    callback(null, `${Date.now()}-${safeName || 'product'}${ext}`);
  },
});

export const uploadProductImageFiles = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new AppError(400, 'INVALID_PRODUCT_IMAGE', 'Only image files are allowed.'));
      return;
    }
    callback(null, true);
  },
}).array('images', 10);

export const createProduct: RequestHandler = async (req, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);
    const product = await productService.create(input, req.userId);
    res.status(201).json(ok(product));
  } catch (error) {
    next(error);
  }
};

export const listProducts: RequestHandler = async (_req, res, next) => {
  try {
    res.json(ok(await productService.list()));
  } catch (error) {
    next(error);
  }
};

export const updateProduct: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const input = updateProductSchema.parse(req.body);
    res.json(
      ok(await productService.update(Array.isArray(id) ? id[0] : (id ?? ''), input, req.userId)),
    );
  } catch (error) {
    next(error);
  }
};

export const uploadProductImages: RequestHandler = async (req, res, next) => {
  try {
    const id = req.params['id'];
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      throw new AppError(400, 'PRODUCT_IMAGE_REQUIRED', 'Select at least one image to upload.');
    }

    const productId = Array.isArray(id) ? id[0] : (id ?? '');
    const product = await productService.addImages(
      productId,
      files.map((file, index) => ({
        url: storedProductImageUrl(file.filename),
        altText: file.originalname,
        sortOrder: index + 1,
      })),
      req.userId,
    );
    res.status(201).json(ok(product));
  } catch (error) {
    next(error);
  }
};
