export default async function handler(req, res) {
  // 1. Verificación de método: Solo permitimos solicitudes POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

 
  const { query, context } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  // 3. Obtenemos la API Key de forma segura desde las variables de entorno de Vercel
  // Recuerda configurar 'GEMINI_API_KEY' en el panel de Vercel (Settings > Environment Variables)
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: API Key missing' });
  }

  // 4. Definimos el conocimiento base según el contexto (Jobs o ReporFlow)
  // Esto le da a la IA la información necesaria para responder correctamente.
  const knowledgeBase = context === 'jobs' 
      ? "UrbanFix Jobs es un marketplace de servicios locales. Características clave: Usa pagos en Escrow (el dinero se retiene hasta finalizar el trabajo). Se verifica la identidad de los usuarios con documento y selfie para seguridad. Los trabajos se publican gratis. Hay chat integrado y sistema de calificación." 
      : "ReporFlow es una herramienta SaaS para empresas. Función principal: Automatizar reportes de trabajo de campo. Tiene una App móvil para que los trabajadores suban fotos y horas, y una Web para que los administradores gestionen todo. Genera reportes en Excel automáticos listos para nómina. Se organiza por Grupos de trabajo o Proyectos.";

  // 5. Instrucción del sistema para la IA
  const systemPrompt = `Eres un asistente de soporte técnico experto y amable para ${context === 'jobs' ? 'UrbanFix' : 'ReporFlow'}. 
  Tu objetivo es ayudar al usuario respondiendo su duda basándote ESTRICTAMENTE en este contexto: "${knowledgeBase}".
  Si la pregunta no tiene nada que ver con el contexto, di amablemente que solo puedes responder sobre la plataforma.
  Responde de forma breve, concisa y usa formato Markdown simple (negritas, listas) si ayuda a la claridad.`;

  try {
    // 6. Llamada segura a la API de Google Gemini desde el servidor
    // Usamos el modelo gemini-2.0-flash-exp o gemini-1.5-flash según disponibilidad, ajusta la URL si es necesario.
    // La URL estándar para la API REST es:
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: query }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
        })
    });

    if (!response.ok) {
        throw new Error(`Google API Error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // 7. Enviamos la respuesta limpia de vuelta a tu página web
    res.status(200).json(data);

  } catch (error) {
    console.error("Error calling Gemini:", error);
    res.status(500).json({ error: 'Error connecting to AI service' });
  }
}