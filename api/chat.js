export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "A aplicação ainda não foi configurada. Adicione OPENAI_API_KEY nas variáveis de ambiente da Vercel."
    });
  }

  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length || messages.length > 20) {
      return res.status(400).json({ error: "Envie entre 1 e 20 mensagens." });
    }

    const input = messages.map((m) => {
      if (!m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string") {
        throw new Error("Formato de mensagem inválido.");
      }
      return { role: m.role, content: m.content.slice(0, 12000) };
    });

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-astra",
        instructions: "Você é um assistente útil. Responda em português quando o usuário escrever em português.",
        input,
        store: false
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || "A API da OpenAI não conseguiu processar a solicitação."
      });
    }

    return res.status(200).json({ reply: data.output_text || "Não foi possível obter uma resposta em texto." });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Não foi possível processar a solicitação." });
  }
}