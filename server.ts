import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { INITIAL_PRODUCTS } from './src/data/initialProducts.ts';
import { INITIAL_ARTICLES } from './src/data/initialArticles.ts';
import { BannerSettings, Product, Article } from './src/types/index.ts';
import { extractProductFromMlUrlOrText } from './src/services/linkExtractorService.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Persistence file location
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'catalog.json');

const DEFAULT_BANNER: BannerSettings = {
  headline: 'AS MELHORES OFERTAS DE TECNOLOGIA ESTÃO AQUI!',
  subheadline: 'Encontre produtos incríveis, descubra promoções e aproveite as melhores oportunidades.',
  buttonText: 'EXPLORAR OFERTAS',
  campaignBadge: 'OFERTAS VERIFICADAS MERCADO LIVRE',
  backgroundImage: '/src/assets/images/hero_tech_oferta_1794274835256.jpg',
};

interface CatalogData {
  products: Product[];
  articles: Article[];
  banner: BannerSettings;
}

function loadCatalog(): CatalogData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
      const initialData: CatalogData = {
        products: INITIAL_PRODUCTS,
        articles: INITIAL_ARTICLES,
        banner: DEFAULT_BANNER,
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
      articles: Array.isArray(parsed.articles) ? parsed.articles : INITIAL_ARTICLES,
      banner: parsed.banner || DEFAULT_BANNER,
    };
  } catch (err) {
    console.error('Error reading catalog file, using defaults:', err);
    return {
      products: INITIAL_PRODUCTS,
      articles: INITIAL_ARTICLES,
      banner: DEFAULT_BANNER,
    };
  }
}

function saveCatalog(data: CatalogData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save catalog to disk:', err);
  }
}

// ---------------- REST API ROUTES ----------------

// Get complete catalog
app.get('/api/catalog', (req: Request, res: Response) => {
  const data = loadCatalog();
  res.json(data);
});

// Save or Update Product
app.post('/api/products', (req: Request, res: Response) => {
  const productData = req.body;
  if (!productData || !productData.name || !productData.price) {
    return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
  }

  const catalog = loadCatalog();
  const dateStr = new Intl.DateTimeFormat('pt-BR').format(new Date());

  let discountPercent = productData.discountPercent;
  if (productData.prevPrice && productData.prevPrice > productData.price) {
    discountPercent = Math.round(((productData.prevPrice - productData.price) / productData.prevPrice) * 100);
  } else if (!productData.prevPrice) {
    discountPercent = undefined;
  }

  const id = productData.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const finalProduct: Product = {
    ...productData,
    id,
    discountPercent,
    updatedAt: dateStr,
  };

  const existingIndex = catalog.products.findIndex(p => p.id === id);
  if (existingIndex >= 0) {
    catalog.products[existingIndex] = finalProduct;
  } else {
    catalog.products.unshift(finalProduct);
  }

  saveCatalog(catalog);
  res.json({ success: true, product: finalProduct, products: catalog.products });
});

// Delete Product
app.delete('/api/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const catalog = loadCatalog();
  catalog.products = catalog.products.filter(p => p.id !== id);
  saveCatalog(catalog);
  res.json({ success: true, products: catalog.products });
});

// Toggle Product Active State
app.post('/api/products/toggle/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const catalog = loadCatalog();
  catalog.products = catalog.products.map(p =>
    p.id === id ? { ...p, isActive: !p.isActive } : p
  );
  saveCatalog(catalog);
  res.json({ success: true, products: catalog.products });
});

// Helper to intelligently apply affiliate tag/params to an affiliate URL
function applyAffiliateToUrl(originalUrl: string, tagOrInput: string): string {
  const cleanInput = (tagOrInput || '').trim();
  if (!cleanInput) return originalUrl;

  let url = originalUrl || '';

  // Strip existing hash origin like #origin=affiliate_techoferta or any hash
  url = url.replace(/#origin=[^&#]*/g, '');
  url = url.replace(/#.*$/, '');

  const [baseUrl, existingQuery = ''] = url.split('?');
  const params = new URLSearchParams(existingQuery);

  const normalized = cleanInput.startsWith('?') ? cleanInput.substring(1) : cleanInput;

  if (normalized.includes('=')) {
    // Input is query parameters like matt_tool=12345&matt_word=tag
    const inputParams = new URLSearchParams(normalized);
    inputParams.forEach((val, key) => {
      params.set(key, val);
    });
  } else {
    // Input is a plain tag / user ID
    params.set('origin', normalized);
    params.set('matt_word', normalized);
  }

  const newQuery = params.toString();
  return newQuery ? `${baseUrl}?${newQuery}` : baseUrl;
}

// Bulk Affiliate Tag Update
app.post('/api/products/bulk-tag', (req: Request, res: Response) => {
  const { tag } = req.body;
  if (!tag || typeof tag !== 'string') {
    return res.status(400).json({ error: 'Tag inválida' });
  }

  const cleanTag = tag.trim();
  const catalog = loadCatalog();

  catalog.products = catalog.products.map(item => {
    const updatedUrl = applyAffiliateToUrl(item.affiliateUrl || '', cleanTag);
    return { ...item, affiliateUrl: updatedUrl };
  });

  saveCatalog(catalog);
  res.json({ success: true, updatedCount: catalog.products.length, products: catalog.products });
});

// Bulk Links Update (Batch direct affiliate URLs per product)
app.post('/api/products/bulk-links', (req: Request, res: Response) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Array de atualizações inválido' });
  }

  const catalog = loadCatalog();
  const updateMap = new Map<string, string>();
  for (const item of updates) {
    if (item && item.id && typeof item.affiliateUrl === 'string') {
      updateMap.set(item.id, item.affiliateUrl.trim());
    }
  }

  let count = 0;
  catalog.products = catalog.products.map(p => {
    if (updateMap.has(p.id)) {
      const newUrl = updateMap.get(p.id)!;
      if (newUrl && newUrl !== p.affiliateUrl) {
        count++;
        return { ...p, affiliateUrl: newUrl };
      }
    }
    return p;
  });

  saveCatalog(catalog);
  res.json({ success: true, updatedCount: count, products: catalog.products });
});

let geminiQuotaCooldownUntil = 0;

// Extract and auto-generate product from Mercado Livre link
app.post('/api/ml/extract-link', async (req: Request, res: Response) => {
  const { url, snippet, affiliateTag } = req.body;
  if (!url && !snippet) {
    return res.status(400).json({ error: 'Forneça o link ou texto do anúncio' });
  }

  try {
    let resolvedUrl = (url || '').trim();

    // If it's a shortlink, try to resolve redirect canonical location
    if (resolvedUrl.includes('/sec/') || resolvedUrl.includes('meli.la')) {
      try {
        const headRes = await fetch(resolvedUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
        });
        if (headRes.url && headRes.url !== resolvedUrl && !headRes.url.includes('/gz/account-verification')) {
          resolvedUrl = headRes.url;
        } else if (headRes.url && headRes.url.includes('go=')) {
          const goParam = new URL(headRes.url).searchParams.get('go');
          if (goParam) resolvedUrl = decodeURIComponent(goParam);
        }
      } catch {
        // Fallback to original URL
      }
    }

    // Try Gemini if GEMINI_API_KEY is present and not currently on quota cooldown
    if (process.env.GEMINI_API_KEY && Date.now() > geminiQuotaCooldownUntil) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        });

        const prompt = `Você é o extrator oficial de produtos do portal TECH OFERTA para o Mercado Livre Brasil.
O usuário quer cadastrar automaticamente este anúncio:
Link ou código: "${resolvedUrl || url}"
Texto adicional fornecido: "${snippet || ''}"

Use a ferramenta de busca para encontrar as informações REAIS e ATUALIZADAS deste anúncio ou produto no Mercado Livre Brasil.
Retorne um objeto JSON estritamente válido (sem markdown em volta) com:
{
  "name": "Nome completo e atrativo do produto",
  "brand": "Marca (ex: Apple, Samsung, JBL)",
  "category": "Uma destas opções exatas: 'caixas-de-som-e-fones', 'celulares-e-acessorios', 'tvs-e-smart-tvs', 'notebooks-e-computadores', 'produtos-gamer', 'smartwatches', 'carregadores-e-cabos', 'eletrodomesticos', 'informatica', 'todos-os-eletronicos'",
  "price": 0.00,
  "prevPrice": 0.00,
  "discountPercent": 0,
  "specs": ["Especificação 1", "Especificação 2", "Especificação 3", "Especificação 4", "Especificação 5"],
  "description": "Breve texto promocional destacando garantia e qualidade",
  "image": "URL de imagem de alta qualidade do produto",
  "mlItemId": "Código MLB se encontrado"
}`;

        const aiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const textResult = aiResponse.text || '';
        const jsonMatch = textResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          let finalAffiliateUrl = url || resolvedUrl;
          if (!finalAffiliateUrl.includes('/sec/') && !finalAffiliateUrl.includes('meli.la') && !finalAffiliateUrl.includes('origin=')) {
            const tag = affiliateTag || 'affiliate_techoferta';
            finalAffiliateUrl += (finalAffiliateUrl.includes('?') ? '&' : '?') + `origin=${tag}&matt_word=${tag}`;
          }

          const product: Omit<Product, 'id' | 'updatedAt'> = {
            name: parsed.name || 'Produto Tech Oferta',
            brand: parsed.brand || 'Original',
            category: parsed.category || 'todos-os-eletronicos',
            price: Number(parsed.price) || 299.90,
            prevPrice: parsed.prevPrice ? Number(parsed.prevPrice) : undefined,
            discountPercent: parsed.discountPercent || undefined,
            specs: Array.isArray(parsed.specs) && parsed.specs.length > 0 ? parsed.specs : ['100% Original Mercado Livre', 'Compra Garantida', 'Envio Rápido'],
            description: parsed.description || 'Oferta verificada no Mercado Livre com envio rápido e garantia.',
            image: parsed.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
            affiliateUrl: finalAffiliateUrl,
            isFeatured: false,
            isBestSeller: false,
            isSpecialOffer: !!(parsed.discountPercent && parsed.discountPercent >= 15),
            isActive: true,
            rating: 4.8,
            mlItemId: parsed.mlItemId,
          };

          return res.json({ success: true, source: 'gemini_ai', product });
        }
      } catch (geminiErr: any) {
        const errStr = String(geminiErr?.message || geminiErr || '');
        if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
          // Put Gemini into cooldown for 10 minutes to prevent quota exhaustion errors
          geminiQuotaCooldownUntil = Date.now() + 10 * 60 * 1000;
        }
        // Quietly fallback to high fidelity local extractor without logging stack traces to stderr
      }
    }

    // High fidelity deterministic extraction fallback (works 100% offline, zero API quota needed)
    const result = extractProductFromMlUrlOrText(resolvedUrl || url, snippet, affiliateTag);
    return res.json({ success: true, source: result.source, product: result.product });
  } catch (err: any) {
    // Ultimate safety fallback so user never gets a 500 error
    const fallbackResult = extractProductFromMlUrlOrText(url || '', snippet, affiliateTag);
    return res.json({ success: true, source: 'safety_fallback', product: fallbackResult.product });
  }
});

app.post('/api/banner', (req: Request, res: Response) => {
  const bannerSettings = req.body;
  const catalog = loadCatalog();
  catalog.banner = { ...catalog.banner, ...bannerSettings };
  saveCatalog(catalog);
  res.json({ success: true, banner: catalog.banner });
});

// Save or Update Article
app.post('/api/articles', (req: Request, res: Response) => {
  const articleData = req.body;
  const catalog = loadCatalog();
  const id = articleData.id || `art-${Date.now()}`;
  const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  const finalArticle: Article = {
    ...articleData,
    id,
    date: articleData.date || dateStr,
  };

  const existingIndex = catalog.articles.findIndex(a => a.id === id);
  if (existingIndex >= 0) {
    catalog.articles[existingIndex] = finalArticle;
  } else {
    catalog.articles.unshift(finalArticle);
  }

  saveCatalog(catalog);
  res.json({ success: true, article: finalArticle, articles: catalog.articles });
});

// Delete Article
app.delete('/api/articles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const catalog = loadCatalog();
  catalog.articles = catalog.articles.filter(a => a.id !== id);
  saveCatalog(catalog);
  res.json({ success: true, articles: catalog.articles });
});

// Reset Catalog to Defaults
app.post('/api/reset', (req: Request, res: Response) => {
  const resetData: CatalogData = {
    products: INITIAL_PRODUCTS,
    articles: INITIAL_ARTICLES,
    banner: DEFAULT_BANNER,
  };
  saveCatalog(resetData);
  res.json({ success: true, catalog: resetData });
});

// Import Whole Catalog
app.post('/api/import', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || (!payload.products && !payload.articles && !payload.banner)) {
    return res.status(400).json({ error: 'Arquivo de catálogo inválido' });
  }

  const current = loadCatalog();
  const updatedData: CatalogData = {
    products: Array.isArray(payload.products) ? payload.products : current.products,
    articles: Array.isArray(payload.articles) ? payload.articles : current.articles,
    banner: payload.banner && typeof payload.banner === 'object' ? payload.banner : current.banner,
  };

  saveCatalog(updatedData);
  res.json({ success: true, catalog: updatedData });
});

// ---------------- VITE OR STATIC SERVING ----------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tech Oferta server running on port ${PORT} (isProd: ${isProd})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
