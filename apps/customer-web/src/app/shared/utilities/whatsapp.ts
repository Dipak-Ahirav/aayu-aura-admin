const BUSINESS_WHATSAPP_NUMBER = '917972109874';

export function whatsappUrl(message: string): string {
  return `https://wa.me/${BUSINESS_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
