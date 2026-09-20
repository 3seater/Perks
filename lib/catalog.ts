import { required } from './config';
export const brands = ['DoorDash', 'Uber', 'Amazon', 'Steam'] as const;
export type Brand = typeof brands[number];
export const denominations = [5, 10, 25, 50] as const;
export function productId(brand: Brand) {
  const id = Number(required(`RELOADLY_${brand.toUpperCase()}_PRODUCT_ID`));
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Invalid product configuration');
  return id;
}
