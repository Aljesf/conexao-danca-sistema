export type AiMode = "economico" | "padrao" | "profundo";

function getModelByMode(mode: AiMode) {
  switch (mode) {
    case "economico":
      return "gpt-4.1-mini";
    case "profundo":
      return "gpt-4.1";
    case "padrao":
    default:
      return process.env.OPENAI_MODEL || "gpt-4.1-mini";
  }
}

export type AdminAiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Função principal usada pelo painel /admin/ia
 * Faz a chamada direta à API da OpenAI via fetch,
 * sem depender de SDK externo.
 */
export async function adminAskAi(
  messages: AdminAiMessage[],
  mode: AiMode = "economico"
) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não está definida no ambiente do servidor.");
  }

  const model = getModelByMode(mode);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Erro da API OpenAI (status ${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as {
    choices: { message: { role?: string; content?: string } }[];
  };

  const msg = data.choices[0]?.message;

  return {
    role: (msg?.role ?? "assistant") as "assistant",
    content: msg?.content ?? "",
  };
}
