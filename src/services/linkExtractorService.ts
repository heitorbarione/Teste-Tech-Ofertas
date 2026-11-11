import { CategoryId, Product } from '../types';
import { guessCategory } from './mercadoLivreService';

const POPULAR_BRANDS = [
  'Apple', 'Samsung', 'JBL', 'Sony', 'LG', 'Dell', 'Logitech', 'Xiaomi',
  'Redmi', 'Motorola', 'Philips', 'Lenovo', 'Asus', 'Acer', 'TP-Link',
  'Anker', 'Razer', 'HyperX', 'Corsair', 'PlayStation', 'Xbox', 'Nintendo',
  'Mondial', 'Britânia', 'Electrolux', 'Consul', 'Brastemp', 'Walita',
  'TCL', 'Hisense', 'Poco', 'Realme', 'Kingston', 'SanDisk', 'Seagate'
];

// High quality curated tech images library for matching when scraping directly
const CURATED_TECH_IMAGES: Record<string, string> = {
  'iphone': 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
  'samsung galaxy': 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
  'galaxy s24': 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80',
  'celular': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
  'smartphone': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
  'jbl': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80',
  'caixa de som': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',
  'fone': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  'headphone': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
  'airpods': 'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=800&auto=format&fit=crop&q=80',
  'sony': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
  'tv': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
  'smart tv': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80',
  'monitor': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80',
  'notebook': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',
  'laptop': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  'macbook': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  'gamer': 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80',
  'teclado': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
  'mouse': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=80',
  'smartwatch': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  'relógio': 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',
  'carregador': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
  'cabo': 'https://images.unsplash.com/photo-1608248597359-0a6042971207?w=800&auto=format&fit=crop&q=80',
  'air fryer': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80',
  'roteador': 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&auto=format&fit=crop&q=80',
};

function selectProductImage(title: string, category: CategoryId): string {
  const lower = title.toLowerCase();
  for (const [key, img] of Object.entries(CURATED_TECH_IMAGES)) {
    if (lower.includes(key)) {
      return img;
    }
  }

  // Category fallback
  switch (category) {
    case 'caixas-de-som-e-fones':
      return 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80';
    case 'celulares-e-acessorios':
      return 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80';
    case 'tvs-e-smart-tvs':
      return 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800&auto=format&fit=crop&q=80';
    case 'notebooks-e-computadores':
      return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80';
    case 'produtos-gamer':
      return 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80';
    case 'smartwatches':
      return 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80';
    case 'carregadores-e-cabos':
      return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80';
    case 'eletrodomesticos':
      return 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=80';
    case 'informatica':
      return 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80';
    default:
      return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80';
  }
}

export function detectBrandFromText(text: string): string {
  for (const b of POPULAR_BRANDS) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
      return b;
    }
  }
  return 'Original';
}

export function extractSpecsFromTitle(title: string): string[] {
  const specs: string[] = [];
  const t = title.toLowerCase();

  // Storage
  const storageMatch = title.match(/\b(64|128|256|512)\s*(gb|tb)\b/i) || title.match(/\b(1|2)\s*tb\b/i);
  if (storageMatch) specs.push(`Armazenamento: ${storageMatch[0].toUpperCase()}`);

  // RAM
  const ramMatch = title.match(/\b(4|6|8|12|16|24|32|64)\s*gb\s*(ram|de ram)?\b/i);
  if (ramMatch && !storageMatch?.[0].includes(ramMatch[1])) {
    specs.push(`Memória RAM: ${ramMatch[1]} GB`);
  }

  // Connectivity
  if (t.includes('5g')) specs.push('Conectividade: 5G Ultra-rápido');
  else if (t.includes('4g')) specs.push('Conectividade: 4G');
  if (t.includes('bluetooth')) specs.push('Conectividade: Bluetooth');
  if (t.includes('wi-fi') || t.includes('wifi')) specs.push('Conectividade: Wi-Fi Integrado');

  // Screen
  const screenMatch = title.match(/\b([0-9]{1,2}(\.[0-9])?)\s*("|polegadas|pol)\b/i);
  if (screenMatch) specs.push(`Tela: ${screenMatch[1]}" Polegadas`);
  if (t.includes('oled')) specs.push('Painel: OLED');
  else if (t.includes('qled')) specs.push('Painel: QLED');
  else if (t.includes('4k')) specs.push('Resolução: 4K Ultra HD');

  // Audio & Power
  const wattMatch = title.match(/\b([0-9]{2,4})\s*w(\s*rms)?\b/i);
  if (wattMatch) specs.push(`Potência: ${wattMatch[0].toUpperCase()}`);

  // General features
  if (t.includes('prova d\'água') || t.includes('ip67') || t.includes('ip68') || t.includes('a prova dagua')) {
    specs.push('Resistência: À prova d\'água');
  }
  if (t.includes('cancelamento de ruído') || t.includes('noise cancelling') || t.includes('anc')) {
    specs.push('Áudio: Cancelamento Ativo de Ruído (ANC)');
  }
  if (t.includes('usb-c')) specs.push('Conexão: USB-C');

  // Fill in guarantees if list is short
  if (specs.length < 3) {
    specs.push('Compra Garantida Mercado Livre');
    specs.push('Envio rápido com rastreamento');
    specs.push('Garantia oficial do vendedor');
  }

  return specs.slice(0, 5);
}

export function parsePricesFromSnippet(text?: string): { price?: number; prevPrice?: number; discountPercent?: number } {
  if (!text) return {};

  const cleanNum = (str?: string): number | undefined => {
    if (!str) return undefined;
    const norm = str.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(norm);
    return isNaN(n) ? undefined : n;
  };

  const deMatch = text.match(/de\s*r?\$?\s*([0-9\.\,]+)/i);
  const porMatch = text.match(/por\s*r?\$?\s*([0-9\.\,]+)/i);

  const prevPrice = deMatch ? cleanNum(deMatch[1]) : undefined;
  let price = porMatch ? cleanNum(porMatch[1]) : undefined;

  if (!price) {
    const singleMatch = text.match(/r\$\s*([0-9\.\,]+)/i);
    if (singleMatch) price = cleanNum(singleMatch[1]);
  }

  let discountPercent: number | undefined = undefined;
  if (prevPrice && price && prevPrice > price) {
    discountPercent = Math.round(((prevPrice - price) / prevPrice) * 100);
  }

  return { price, prevPrice, discountPercent };
}

export interface ExtractedProductResult {
  product: Omit<Product, 'id' | 'updatedAt'>;
  source: 'direct_slug' | 'gemini_search' | 'text_parser';
  mlbId?: string;
  originalLink: string;
}

/**
 * Main parser that turns any Mercado Livre URL, shortlink, or raw text into a complete product
 */
export function extractProductFromMlUrlOrText(
  urlOrText: string,
  extraSnippet?: string,
  affiliateTag = 'affiliate_techoferta'
): ExtractedProductResult {
  const input = urlOrText.trim();
  const fullText = `${input} ${extraSnippet || ''}`;

  let rawUrl = '';
  let extraText = extraSnippet || '';

  if (input.startsWith('http://') || input.startsWith('https://')) {
    rawUrl = input;
  } else {
    // Check if input contains a URL
    const urlMatch = input.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      rawUrl = urlMatch[1];
      extraText = input.replace(rawUrl, '') + ' ' + (extraSnippet || '');
    } else {
      extraText = input + ' ' + (extraSnippet || '');
    }
  }

  // 1. Extract MLB ID if present
  let mlbId: string | undefined;
  const mlbMatch = fullText.match(/\bMLB-?([0-9]{7,15})\b/i) || fullText.match(/\/p\/(MLB[0-9]{7,15})/i);
  if (mlbMatch) {
    mlbId = (mlbMatch[1] ? (mlbMatch[1].startsWith('MLB') ? mlbMatch[1] : `MLB${mlbMatch[1]}`) : mlbMatch[0]).toUpperCase();
  }

  // 2. Extract Slug and Title
  let title = '';
  if (rawUrl) {
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];
    const pMatch = cleanUrl.match(/\/([^\/]+)\/p\/(MLB[0-9]+)/i);
    const itemMatch = cleanUrl.match(/MLB-?([0-9]+)-([^\/]+)/i);

    if (pMatch && pMatch[1]) {
      title = decodeURIComponent(pMatch[1]).replace(/-/g, ' ');
    } else if (itemMatch && itemMatch[2]) {
      title = decodeURIComponent(itemMatch[2].replace(/_JM.*$/, '')).replace(/-/g, ' ');
    } else {
      const parts = cleanUrl.replace(/^https?:\/\/[^\/]+\//, '').split('/');
      if (parts[0] && !parts[0].startsWith('sec') && !parts[0].startsWith('gz')) {
        title = decodeURIComponent(parts[0]).replace(/-/g, ' ');
      }
    }
  }

  // If no title from URL, look in extraText
  if (!title || title.length < 5) {
    const textWithoutUrl = extraText.replace(/https?:\/\/[^\s]+/g, '').trim();
    if (textWithoutUrl.length >= 5) {
      title = textWithoutUrl.split('\n')[0].replace(/de r\$.*$/i, '').replace(/r\$.*$/i, '').trim();
    }
  }

  // Capitalize title nicely
  title = title
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace(/\b(De|Do|Da|Em|Por|Com|E|O|A|Para)\b/gi, m => m.toLowerCase())
    .trim();

  if (!title) {
    title = 'Oferta de Tecnologia Mercado Livre';
  }

  // 3. Detect Brand & Category
  const brand = detectBrandFromText(title + ' ' + extraText);
  const category = guessCategory(title);

  // 4. Extract Specs
  const specs = extractSpecsFromTitle(title + ' ' + extraText);

  // 5. Extract Prices
  const { price: extractedPrice, prevPrice: extractedPrev, discountPercent: extractedDisc } = parsePricesFromSnippet(fullText);

  // Default price benchmark if none found
  let price = extractedPrice || 299.90;
  let prevPrice = extractedPrev;
  let discountPercent = extractedDisc;

  if (prevPrice && prevPrice > price && !discountPercent) {
    discountPercent = Math.round(((prevPrice - price) / prevPrice) * 100);
  }

  // 6. Select high-res image
  const image = selectProductImage(title, category);

  // 7. Affiliate link
  let finalAffiliateUrl = rawUrl || `https://lista.mercadolivre.com.br/?origin=${affiliateTag}`;
  if (!finalAffiliateUrl.includes('/sec/') && !finalAffiliateUrl.includes('meli.la') && !finalAffiliateUrl.includes('origin=')) {
    finalAffiliateUrl += (finalAffiliateUrl.includes('?') ? '&' : '?') + `origin=${affiliateTag}&matt_word=${affiliateTag}`;
  }

  const description = `Confira a oferta oficial do produto ${title} no Mercado Livre. Produto 100% autêntico com envio rápido, garantia do fabricante e compra protegida.`;

  return {
    source: 'direct_slug',
    mlbId,
    originalLink: rawUrl || input,
    product: {
      name: title,
      brand,
      category,
      description,
      specs,
      image,
      price,
      prevPrice,
      discountPercent,
      affiliateUrl: finalAffiliateUrl,
      isFeatured: false,
      isBestSeller: false,
      isSpecialOffer: discountPercent !== undefined && discountPercent >= 15,
      isActive: true,
      rating: 4.8,
      mlItemId: mlbId,
    },
  };
}
