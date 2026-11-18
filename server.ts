import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Initialize Gemini client on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function callGeminiWithFallback(params: any) {
  const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
  let lastErr: any;
  for (const model of modelsToTry) {
    try {
      return await ai.models.generateContent({
        ...params,
        model,
      });
    } catch (e: any) {
      lastErr = e;
      console.warn(`Model ${model} error (${e?.status || e?.code || e?.message}), trying fallback...`);
    }
  }
  throw lastErr;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // API Routes for Gemini
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-4-argon'];
      let responseText = '';
      let success = false;

      for (const model of modelsToTry) {
        try {
          const chat = ai.chats.create({
            model,
            config: {
              systemInstruction: 'Você é um assistente especialista em edição de vídeos curtos (Reels, TikTok, Shorts), cortes virais, ganchos magnéticos e estratégias de retenção. Ajude o criador com ideias, títulos, legendas e melhorias de corte em português.',
            }
          });
          const response = await chat.sendMessage({ message });
          responseText = response.text || 'Sem resposta da IA.';
          success = true;
          break;
        } catch (e: any) {
          console.warn(`Chat model ${model} failed:`, e?.message || e);
        }
      }

      if (!success) {
        return res.status(500).json({ error: 'Todos os modelos do Gemini estão ocupados no momento. Tente novamente em alguns segundos.' });
      }

      return res.json({ text: responseText });
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao conversar com o Gemini.' });
    }
  });

  app.post('/api/gemini/analyze-cuts', async (req, res) => {
    try {
      const { transcript, prompt, duration, count } = req.body;
      if (!transcript || !prompt) {
        return res.status(400).json({ error: 'Transcript and prompt are required' });
      }

      const response = await callGeminiWithFallback({
        contents: `Com base na transcrição do vídeo abaixo e no pedido do usuário, analise e selecione os melhores momentos (cortes) que atendem perfeitamente à instrução.

Pedido do usuário: "${prompt}"
Duração total do vídeo: ${duration || 'desconhecida'} segundos
Quantidade de momentos desejada: ${count || 3}

Transcrição do vídeo (com timestamps em segundos):
${JSON.stringify(transcript)}

Retorne um JSON estrito contendo um array "moments" com os melhores trechos. Cada item deve ter:
- start: número em segundos (início do corte)
- end: número em segundos (fim do corte)
- title: título curto e chamativo para o momento
- tags: array de 2 ou 3 tags (ex: ["Viral", "Momento Chave"])
- excerpt: resumo ou fala principal do trecho
- hookSuggestion: gancho magnético inicial de impacto (máximo 60 caracteres)
- bannerSuggestion: texto curto para o banner superior (máximo 25 caracteres)`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              moments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    start: { type: Type.NUMBER },
                    end: { type: Type.NUMBER },
                    title: { type: Type.STRING },
                    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                    excerpt: { type: Type.STRING },
                    hookSuggestion: { type: Type.STRING },
                    bannerSuggestion: { type: Type.STRING },
                  },
                },
              },
              note: { type: Type.STRING, description: 'Breve comentário ou explicação da IA sobre a busca.' }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{"moments":[]}');
      return res.json(data);
    } catch (error: any) {
      console.error('Gemini analyze-cuts error:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao analisar cortes com Gemini.' });
    }
  });

  app.post('/api/gemini/generate-metadata', async (req, res) => {
    try {
      const { clipText, tone, niche, platforms } = req.body;
      if (!clipText) {
        return res.status(400).json({ error: 'Clip text is required' });
      }

      const response = await callGeminiWithFallback({
        contents: `Crie títulos, descrições virais e hashtags otimizadas para YouTube Shorts, TikTok e Instagram Reels com base no seguinte trecho de vídeo:

Texto do corte: "${clipText}"
Estilo/Tom: ${tone || 'curioso'}
Nicho: ${niche || 'auto'}
Plataformas solicitadas: ${JSON.stringify(platforms || ['YouTube Shorts', 'TikTok', 'Instagram Reels'])}

Retorne um JSON estrito contendo um array "outputs" com objetos tendo:
- platform: nome da plataforma
- title: título chamativo
- description: descrição completa pronta para postar com CTA e hashtags`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              outputs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    platform: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text || '{"outputs":[]}');
      return res.json(data);
    } catch (error: any) {
      console.error('Gemini generate-metadata error:', error);
      return res.status(500).json({ error: error?.message || 'Erro ao gerar metadados com Gemini.' });
    }
  });

  // Vite dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
