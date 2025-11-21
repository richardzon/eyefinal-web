export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  currencySymbol: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_TSd8pIm12rA0h6',
    priceId: 'price_1SVhsNGYrToXBLkjCnx4eXuE',
    name: 'Monthly subscription',
    description: 'Monthly fee for Predictor v3.0',
    price: 150.00,
    currency: 'eur',
    currencySymbol: '€',
    mode: 'subscription'
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}
