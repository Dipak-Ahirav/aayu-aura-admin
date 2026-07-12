import assert from 'node:assert/strict';
import { fail, ok } from '../dist/infrastructure/http/api-response.js';

assert.deepEqual(ok({ id: 'product_1' }, { page: 1 }), {
  success: true,
  data: { id: 'product_1' },
  meta: { page: 1 },
});

assert.deepEqual(
  fail('PRODUCT_SKU_EXISTS', 'A product with this SKU already exists.', {
    sku: 'Must be unique.',
  }),
  {
    success: false,
    error: {
      code: 'PRODUCT_SKU_EXISTS',
      message: 'A product with this SKU already exists.',
      fieldErrors: { sku: 'Must be unique.' },
    },
  },
);

console.log('api response helper assertions passed');
