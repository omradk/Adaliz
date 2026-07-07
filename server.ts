import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize Firebase Admin App
  if (getApps().length === 0) {
    initializeApp();
  }
  const db = getFirestore();
  
  // Need to set the correct database ID if needed, but in our case, default might be fine,
  // or we need to pass the database URL/ID. Actually, admin.initializeApp() works for default.
  // Wait, the provisioned database ID is ai-studio-... Let's initialize correctly.

  app.post('/api/trendyol-sync', async (req, res) => {
    try {
      const { 
        sellerId, 
        apiKey, 
        apiSecret, 
        startDate: reqStartDate, 
        endDate: reqEndDate,
        defaultCommissionRate = 15,
        barem1Limit = 149.99,
        barem1Price = 39.99,
        barem2Limit = 399.99,
        barem2Price = 59.99,
        cargoBaremUstuPrice = 69.99
      } = req.body;
      
      if (!sellerId || !apiKey || !apiSecret) {
        return res.status(400).json({ error: 'Trendyol API bilgileri eksik.' });
      }

      const authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;

      // Date logic
      const requestedEndDate = reqEndDate ? parseInt(reqEndDate) : new Date().getTime();
      // Default to last 30 days if no startDate provided
      const requestedStartDate = reqStartDate ? parseInt(reqStartDate) : (requestedEndDate - (30 * 24 * 60 * 60 * 1000)); 

      let currentStartDate = requestedStartDate;
      let allContent: any[] = [];
      const MAX_CHUNK_MS = 14 * 24 * 60 * 60 * 1000; // 14 days limit by Trendyol

      while (currentStartDate < requestedEndDate) {
        const currentEndDate = Math.min(currentStartDate + MAX_CHUNK_MS, requestedEndDate);

        let page = 0;
        let totalPages = 1;

        while (page < totalPages) {
          const response = await fetch(`https://api.trendyol.com/sapigw/suppliers/${sellerId}/orders?startDate=${currentStartDate}&endDate=${currentEndDate}&size=200&page=${page}`, {
            headers: {
              'Authorization': authHeader,
              'User-Agent': `${sellerId} - MyApp`
            }
          });

          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Trendyol API Hatası (Sipariş): ${response.status} - ${errText}`);
          }

          const data = await response.json();
          if (data.content && data.content.length > 0) {
            allContent.push(...data.content);
          }
          
          totalPages = data.totalPages || 1;
          page++;
        }

        currentStartDate = currentEndDate + 1000; // next chunk starts 1 sec later
      }

      // 2. Fetch EXACT Settlements (Finansal Hareketler) to get kuruşu kuruşuna deductions
      // (This applies to orders that are already delivered and settled)
      let settlementsMap = new Map<string, { commission: number, shipping: number, isReturn?: boolean }>();
      
      let stCurrentStartDate = requestedStartDate;
      while (stCurrentStartDate < requestedEndDate) {
        let stCurrentEndDate = stCurrentStartDate + 14 * 24 * 60 * 60 * 1000;
        if (stCurrentEndDate > requestedEndDate) {
          stCurrentEndDate = requestedEndDate;
        }

        const txTypes = ['Sale', 'Return', 'DeductionInvoices', 'Discount', 'CargoInvoice', 'ReturnInvoice'];
        for (const txType of txTypes) {
          let stPage = 0;
          let stTotalPages = 1;
          
          while (stPage < stTotalPages) {
            try {
              const url = `https://api.trendyol.com/integration/finance/che/sellers/${sellerId}/settlements?startDate=${stCurrentStartDate}&endDate=${stCurrentEndDate}&transactionType=${txType}&page=${stPage}&size=500`;
              const stResponse = await fetch(url, {
                headers: {
                  'Authorization': authHeader,
                  'User-Agent': `${sellerId} - MyApp`
                }
              });

              if (stResponse.ok) {
                const stData = await stResponse.json();
                const items = stData.content || [];
                for (const item of items) {
                   const ordNo = item.orderNumber;
                   if (ordNo) {
                      const comm = Math.abs(item.commissionAmount || 0);
                      const debt = Math.abs(item.debt || 0);
                      
                      let ship = 0;
                      // Kargo kesintileri genelde DeductionInvoices olarak yansır veya description içinde kargo yazar.
                      if (txType === 'DeductionInvoices' || txType === 'CargoInvoice' || (item.description && item.description.toLowerCase().includes('kargo'))) {
                        ship = debt;
                      }

                      if (settlementsMap.has(ordNo)) {
                        const existing = settlementsMap.get(ordNo)!;
                        if (txType === 'Sale') {
                          existing.commission += comm;
                        } else if (txType === 'Return') {
                          existing.commission -= comm;
                        }
                        
                        existing.shipping += ship;
                        
                        if (txType === 'Return' || txType === 'ReturnInvoice') {
                          existing.isReturn = true;
                        }
                      } else {
                        settlementsMap.set(ordNo, { 
                          commission: txType === 'Sale' ? comm : (txType === 'Return' ? -comm : 0), 
                          shipping: ship,
                          isReturn: txType === 'Return' || txType === 'ReturnInvoice'
                        });
                      }
                   }
                }
                stTotalPages = stData.totalPages || 1;
              } else {
                console.warn(`Trendyol Finans API Hata (Type: ${txType}, Page: ${stPage}): ${stResponse.status}`);
                break;
              }
            } catch (e) {
              console.warn("Trendyol Finans API Bağlantı Hatası:", e);
              break;
            }
            stPage++;
          }
        }
        stCurrentStartDate = stCurrentEndDate + 1000; // next chunk starts 1 sec later
      }
      
      // Map to our simplified format
      const orders = allContent.map((order: any) => {
        
        // Eğer sipariş Finans API (Settlement) tarafında varsa tam kesintileri al
        const exactSettlement = settlementsMap.get(order.orderNumber);
        
        let finalCommission = 0;
        let finalShipping = 0;
        let isExact = false;

        const isOrderReturned = exactSettlement?.isReturn || order.status === 'Returned' || order.status === 'UnDeliveredAndReturned' || order.status === 'Rejected';

        // Barem ile tahmini (Estimated) hesaplama (Henüz teslim edilmemiş veya kargo faturası düşmemiş olanlar)
        const estCommission = order.lines.reduce((acc: number, line: any) => {
             const commRate = parseFloat(defaultCommissionRate as any) / 100;
             return acc + (line.price * commRate);
        }, 0);

        const b1Limit = parseFloat(barem1Limit as any);
        const b1Price = parseFloat(barem1Price as any);
        const b2Limit = parseFloat(barem2Limit as any);
        const b2Price = parseFloat(barem2Price as any);
        const fullCargo = parseFloat(cargoBaremUstuPrice as any);

        let estShipping = 0;
        if (order.totalPrice <= b1Limit) {
            estShipping = b1Price;
        } else if (order.totalPrice <= b2Limit) {
            estShipping = b2Price;
        } else {
            estShipping = fullCargo;
        }

        if (isOrderReturned) {
            estShipping = estShipping * 2;
        }

        if (exactSettlement) {
           finalCommission = exactSettlement.commission;
           // Kargo henüz faturalandırılmadıysa tahmini (çarpı 2 vs) hesaplamayı baz alıyoruz
           finalShipping = exactSettlement.shipping > 0 ? exactSettlement.shipping : estShipping;
           isExact = exactSettlement.shipping > 0;
        } else {
           finalCommission = estCommission;
           finalShipping = estShipping;
           isExact = false;
        }

        return {
          id: order.orderNumber,
          productName: order.lines[0]?.productName || 'Bilinmeyen Ürün',
          salePrice: order.totalPrice,
          commission: finalCommission,
          shippingCost: finalShipping,
          date: order.orderDate,
          status: order.status,
          isExact: isExact,
          isReturn: isOrderReturned
        };
      });

      res.json({ orders });

    } catch (error: any) {
      console.error('Trendyol Sync Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/analiz', async (req, res) => {
    try {
      const { orders, geminiApiKey } = req.body;
      
      if (!geminiApiKey) {
        return res.status(400).json({ error: 'Gemini API Key eksik.' });
      }

      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const prompt = `Aşağıdaki e-ticaret sipariş verilerini analiz et. Hangi ürünlerde zarar edildiğini, kargo barem aşımlarını ve fiyatlandırma stratejisi önerilerini kısa ve öz (bullet point şeklinde) Türkçe olarak belirt:\n\n${JSON.stringify(orders, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt
      });

      res.json({ analysis: response.text });
    } catch (error: any) {
      console.error('Analiz Error:', error);
      res.status(500).json({ error: error.message });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
