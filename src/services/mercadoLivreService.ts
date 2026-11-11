import { CategoryId, Product } from '../types';

export interface MLSearchResultItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  thumbnail: string;
  permalink: string;
  condition: string;
  brand?: string;
  category_id?: string;
  attributes?: { id: string; name: string; value_name: string }[];
}

/**
 * Maps common Mercado Livre title keywords or ML categories to Tech Oferta categories
 */
export function guessCategory(title: string): CategoryId {
  const t = title.toLowerCase();

  if (t.includes('caixa de som') || t.includes('fone') || t.includes('headphone') || t.includes('earphone') || t.includes('headset') || t.includes('bluetooth speaker') || t.includes('airpods') || t.includes('galaxy buds')) {
    return 'caixas-de-som-e-fones';
  }
  if (t.includes('iphone') || t.includes('galaxy s') || t.includes('celular') || t.includes('smartphone') || t.includes('redmi') || t.includes('motorola') || t.includes('xiaomi') || t.includes('capa') || t.includes('película')) {
    return 'celulares-e-acessorios';
  }
  if (t.includes('tv') || t.includes('smart tv') || t.includes('oled') || t.includes('qled') || t.includes('soundbar') || t.includes('roku') || t.includes('chromecast') || t.includes('fire tv')) {
    return 'tvs-e-smart-tvs';
  }
  if (t.includes('notebook') || t.includes('macbook') || t.includes('computador') || t.includes('laptop') || t.includes('pc') || t.includes('desktop') || t.includes('all in one')) {
    return 'notebooks-e-computadores';
  }
  if (t.includes('gamer') || t.includes('ps5') || t.includes('playstation') || t.includes('xbox') || t.includes('nintendo') || t.includes('joystick') || t.includes('teclado mecanico') || t.includes('mouse gamer')) {
    return 'produtos-gamer';
  }
  if (t.includes('smartwatch') || t.includes('relógio') || t.includes('galaxy watch') || t.includes('apple watch') || t.includes('mi band') || t.includes('amazfit')) {
    return 'smartwatches';
  }
  if (t.includes('carregador') || t.includes('cabo') || t.includes('fonte') || t.includes('usb-c') || t.includes('lightning') || t.includes('powerbank') || t.includes('adaptador')) {
    return 'carregadores-e-cabos';
  }
  if (t.includes('air fryer') || t.includes('fritadeira') || t.includes('aspirador') || t.includes('robô') || t.includes('cafeteira') || t.includes('microondas') || t.includes('eletrodoméstico')) {
    return 'eletrodomesticos';
  }
  if (t.includes('monitor') || t.includes('ssd') || t.includes('memoria ram') || t.includes('roteador') || t.includes('placa de video') || t.includes('processador') || t.includes('gabinete')) {
    return 'informatica';
  }
  return 'todos-os-eletronicos';
}

/**
 * Searches Mercado Livre MLB official public endpoint
 */
export async function searchMercadoLivre(query: string, limit = 10): Promise<{ items: MLSearchResultItem[]; error?: string }> {
  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await fetch(`https://api.mercadolibre.com/sites/MLB/search?q=${encoded}&limit=${limit}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Mercado Livre API respondeu com status ${res.status}`);
    }

    const data = await res.json();
    const rawResults = data.results || [];

    const items: MLSearchResultItem[] = rawResults.map((item: any) => {
      // High-res image conversion if thumbnail has -I.jpg or similar
      let highResImg = item.thumbnail || '';
      if (highResImg.includes('-I.jpg')) {
        highResImg = highResImg.replace('-I.jpg', '-O.jpg');
      }

      // Brand search in attributes
      let brand = 'Mercado Livre';
      if (Array.isArray(item.attributes)) {
        const brandAttr = item.attributes.find((a: any) => a.id === 'BRAND');
        if (brandAttr && brandAttr.value_name) {
          brand = brandAttr.value_name;
        }
      }

      return {
        id: item.id,
        title: item.title,
        price: item.price,
        original_price: item.original_price,
        currency_id: item.currency_id,
        thumbnail: highResImg,
        permalink: item.permalink,
        condition: item.condition,
        brand,
        attributes: item.attributes,
      };
    });

    return { items };
  } catch (err: any) {
    console.warn('Erro ao consultar API do Mercado Livre:', err);
    return {
      items: [],
      error: err.message || 'Não foi possível conectar à API do Mercado Livre. Verifique sua conexão ou tente buscar por outros termos.',
    };
  }
}

/**
 * Fetches single item from Mercado Livre API by Item ID (e.g. MLB123456789)
 */
export async function getMercadoLivreItem(itemId: string): Promise<{ item?: MLSearchResultItem; error?: string }> {
  try {
    const cleanId = itemId.trim().toUpperCase();
    const res = await fetch(`https://api.mercadolibre.com/items/${cleanId}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Item ${cleanId} não encontrado no Mercado Livre (${res.status})`);
    }

    const data = await res.json();
    let highResImg = '';
    if (data.pictures && data.pictures.length > 0) {
      highResImg = data.pictures[0].secure_url || data.pictures[0].url;
    } else {
      highResImg = (data.thumbnail || '').replace('-I.jpg', '-O.jpg');
    }

    let brand = 'Mercado Livre';
    if (Array.isArray(data.attributes)) {
      const brandAttr = data.attributes.find((a: any) => a.id === 'BRAND');
      if (brandAttr && brandAttr.value_name) {
        brand = brandAttr.value_name;
      }
    }

    return {
      item: {
        id: data.id,
        title: data.title,
        price: data.price,
        original_price: data.original_price,
        currency_id: data.currency_id,
        thumbnail: highResImg,
        permalink: data.permalink,
        condition: data.condition,
        brand,
        attributes: data.attributes,
      },
    };
  } catch (err: any) {
    return {
      error: err.message || 'Erro ao buscar item pelo código do Mercado Livre.',
    };
  }
}

/**
 * Converts ML Search Item into a Tech Oferta Product structure
 */
export function convertMlItemToProduct(item: MLSearchResultItem, affiliateCustomTag = 'affiliate_techoferta'): Omit<Product, 'id' | 'updatedAt'> {
  let affiliateUrl = item.permalink;
  if (!affiliateUrl.includes('origin=')) {
    affiliateUrl += (affiliateUrl.includes('?') ? '&' : '?') + `origin=${affiliateCustomTag}`;
  }

  const category = guessCategory(item.title);
  
  let discountPercent: number | undefined;
  let prevPrice: number | undefined;

  if (item.original_price && item.original_price > item.price) {
    prevPrice = item.original_price;
    discountPercent = Math.round(((item.original_price - item.price) / item.original_price) * 100);
  }

  // Extract specs from attributes
  const specs: string[] = [];
  if (Array.isArray(item.attributes)) {
    const importantAttributes = ['MODEL', 'LINE', 'PROCESSOR_MODEL', 'RAM', 'STORAGE_CAPACITY', 'BATTERY_CAPACITY', 'SCREEN_SIZE', 'RESOLUTION', 'AUDIO_POWER'];
    item.attributes.forEach(attr => {
      if (importantAttributes.includes(attr.id) && attr.value_name) {
        specs.push(`${attr.name}: ${attr.value_name}`);
      }
    });
  }

  if (specs.length === 0) {
    specs.push('Produto 100% Original Mercado Livre');
    specs.push('Envio rápido com Compra Garantida');
    specs.push('Garantia oficial do fabricante');
  }

  return {
    name: item.title,
    brand: item.brand || 'Original',
    category,
    description: `Aproveite esta oferta verificada no Mercado Livre. Produto de alta qualidade, garantido e com excelente avaliação dos compradores.`,
    specs: specs.slice(0, 5),
    image: item.thumbnail,
    price: item.price,
    prevPrice,
    discountPercent,
    affiliateUrl,
    isFeatured: false,
    isBestSeller: false,
    isSpecialOffer: discountPercent !== undefined && discountPercent >= 20,
    isActive: true,
    rating: 4.8,
    mlItemId: item.id,
  };
}
