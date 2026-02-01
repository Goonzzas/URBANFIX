// Este archivo debe guardarse como: /api/gemini.js

export default async function handler(req, res) {
  // 1. Verificación de método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, context } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // 2. Obtener API Key
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  // 3. Contexto (Base de conocimiento)
  const knowledgeBase = context === 'jobs' 
      ? "UrbanFix Jobs es un marketplace de servicios locales. Características clave: Usa pagos en Escrow (el dinero se retiene hasta finalizar el trabajo). Se verifica la identidad de los usuarios con documento y selfie para seguridad. Los trabajos se publican gratis. Hay chat integrado y sistema de calificación." 
      : "ReporFlow es una herramienta SaaS para empresas. Función principal: Automatizar reportes de trabajo de campo. Tiene una App móvil para que los trabajadores suban fotos y horas, y una Web para que los administradores gestionen todo. Genera reportes en Excel automáticos listos para nómina. Se organiza por Grupos de trabajo o Proyectos.";

  const systemPrompt = `Eres un asistente de soporte técnico experto y amable para ${context === 'jobs' ? 'UrbanFix' : 'ReporFlow'}. 
  Tu objetivo es ayudar al usuario respondiendo su duda basándote ESTRICTAMENTE en este contexto: "${knowledgeBase}".
  Si la pregunta no tiene nada que ver con el contexto, di amablemente que solo puedes responder sobre la plataforma.
  Responde de forma breve, concisa y usa formato Markdown simple (negritas, listas) si ayuda a la claridad.`;

  try {
    // 4. Llamada a Google Gemini
    // Endpoint actualizado a v1beta para soporte completo de systemInstruction
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ 
                role: "user",
                parts: [{ text: query }] 
            }],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7, // Creatividad equilibrada
                maxOutputTokens: 500 // Respuestas concisas
            }
        })
    });

    if (!response.ok) {
        // Capturamos el error detallado de Google para depuración en los logs de Vercel
        const errorText = await response.text();
        console.error("Google API Error Details:", errorText);
        throw new Error(`Google API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // 5. VALIDACIÓN ROBUSTA
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
       console.warn("Gemini devolvió respuesta vacía o bloqueada:", JSON.stringify(data));
       // Si fue bloqueado por seguridad u otro motivo, devolvemos un mensaje amigable
       return res.status(200).json({ 
           candidates: [{ 
               content: { 
                   parts: [{ 
                       text: "Lo siento, no pude procesar esa pregunta específica debido a mis filtros de seguridad o un error interno. ¿Podrías intentar reformularla?" 
                   }] 
               } 
           }] 
       });
    }

    // Si todo está bien, enviamos la data original
    res.status(200).json(data);

  } catch (error) {
    console.error("Error en el servidor:", error);
    res.status(200).json({ 
        candidates: [{ 
            content: { 
                parts: [{ 
                    text: "Tuve un problema técnico interno al contactar con la IA. Por favor intenta más tarde." 
                }] 
            } 
        }] 
    });
  }
}
