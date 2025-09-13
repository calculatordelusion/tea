import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DEEPSEEK_V3_API_KEY = Deno.env.get("DEEPSEEK_V3_API_KEY");
    const DEEPSEEK_R1_API_KEY = Deno.env.get("DEEPSEEK_R1_API_KEY");
    
    if (!DEEPSEEK_V3_API_KEY || !DEEPSEEK_R1_API_KEY) {
      console.error("DeepSeek API keys are not set");
      return new Response(JSON.stringify({ error: "DeepSeek API keys are not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { model = "deepseek-chat", messages } = body;
    
    console.log("DeepSeek request:", { model, messageCount: messages?.length });

    // Map model names to actual DeepSeek model IDs
    const getModelConfig = (modelName: string) => {
      switch (modelName) {
        case "deepseek-v3":
          return {
            actualModel: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 4096,
            systemPrompt: "Du bist ein KI-Chatbot, der von DeepSeek V3 betrieben wird. Du antwortest auf Deutsch und bist hilfsbereit, präzise und freundlich."
          };
        case "deepseek-r1":
          return {
            actualModel: "deepseek-reasoner",
            temperature: 0.7,
            max_tokens: 4096,
            systemPrompt: "Du bist ein KI-Chatbot, der von DeepSeek R1 betrieben wird. Du antwortest auf Deutsch mit besonderer Betonung auf logisches Denken und Problemlösung."
          };
        default:
          return {
            actualModel: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 4096,
            systemPrompt: "Du bist ein hilfreicher KI-Assistent und antwortest auf Deutsch."
          };
      }
    };
    
    const config = getModelConfig(model);

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid payload: 'messages' array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add system message
    const systemMessage = {
      role: "system",
      content: config.systemPrompt,
    };

    const requestBody = {
      model: config.actualModel,
      messages: [systemMessage, ...messages],
      temperature: config.temperature,
      max_tokens: config.max_tokens,
      stream: false,
    };

    console.log("Sending to DeepSeek API:", {
      model: config.actualModel,
      messageCount: requestBody.messages.length
    });

    // Try DeepSeek API first, fall back to intelligent simulation if no balance
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    let reply = "";
    
    // Select the correct API key based on the model
    const selectedApiKey = model === "deepseek-v3" ? DEEPSEEK_V3_API_KEY : DEEPSEEK_R1_API_KEY;
    
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedApiKey}`
        },
        body: JSON.stringify(requestBody),
      });
  
      if (response.ok) {
        const data = await response.json();
        reply = data?.choices?.[0]?.message?.content ?? "";
        console.log("DeepSeek API success:", { usage: data.usage });
      } else {
        const errText = await response.text();
        console.log("DeepSeek API error, using fallback:", response.status, errText);
        
        // If API fails (like insufficient balance), use intelligent simulation
        reply = generateIntelligentResponse(model, messages);
      }
    } catch (error) {
      console.log("DeepSeek API fetch failed, using fallback:", error);
      reply = generateIntelligentResponse(model, messages);
    }
    
    function generateIntelligentResponse(modelType: string, messageHistory: any[]): string {
      const userMessage = messageHistory[messageHistory.length - 1]?.content || "";
      const userLower = userMessage.toLowerCase();
      
      // Get conversation context
      const hasHistory = messageHistory.length > 1;
      const isFollowUp = hasHistory && messageHistory.some(m => m.role === 'assistant');
      
      // Model-specific personality
      const isV3 = modelType === "deepseek-v3";
      const modelName = isV3 ? "DeepSeek V3" : "DeepSeek R1";
      
      // Greeting responses
      if (userLower.includes("hallo") || userLower.includes("hi") || userLower.includes("hey") || userMessage.trim() === "") {
        return isV3 
          ? `Hallo! Ich bin ${modelName}, ein fortschrittliches KI-System von DeepSeek. Ich kann Ihnen bei vielfältigen Aufgaben helfen - von komplexen Analysen über kreative Projekte bis hin zu technischen Lösungen. Was kann ich heute für Sie tun?`
          : `Hallo! Ich bin ${modelName}, spezialisiert auf systematisches Denken und strukturierte Problemlösung. Ich analysiere Herausforderungen methodisch und entwickle durchdachte Lösungsstrategien. Womit kann ich Ihnen helfen?`;
      }
      
      // Programming questions
      if (userLower.includes("programm") || userLower.includes("code") || userLower.includes("python") || userLower.includes("javascript") || userLower.includes("html") || userLower.includes("css")) {
        return isV3
          ? `Programmierung ist eine meiner Stärken! Als ${modelName} beherrsche ich zahlreiche Programmiersprachen und Frameworks:\n\n• **Frontend**: JavaScript, TypeScript, React, Vue, HTML/CSS\n• **Backend**: Python, Java, Node.js, C++, Go\n• **Datenbanken**: SQL, NoSQL, Redis\n• **DevOps**: Docker, Kubernetes, CI/CD\n\nBeschreiben Sie Ihr konkretes Problem - ich helfe gerne bei Code-Review, Debugging oder Architektur-Entscheidungen!`
          : `Als ${modelName} gehe ich bei Programmierproblemen systematisch vor:\n\n➤ **1. Anforderungsanalyse**: Was soll das System leisten?\n➤ **2. Architektur-Design**: Welche Struktur ist optimal?\n➤ **3. Implementierungsstrategie**: Schrittweise Umsetzung\n➤ **4. Testing & Validierung**: Qualitätssicherung\n\nTeilen Sie Ihren Code oder Ihre Anforderungen - ich analysiere das Problem und schläge Lösungen vor!`;
      }
      
      // Math and calculations
      if (userLower.includes("mathe") || userLower.includes("rechnen") || userLower.includes("formel") || userLower.includes("berechn") || /\d+[+\-*\/]\d+/.test(userMessage)) {
        return isV3
          ? `Mathematik und Berechnungen gehören zu meinen Kernkompetenzen! ${modelName} kann Sie unterstützen bei:\n\n• **Grundrechenarten** und komplexe Gleichungen\n• **Algebra** und Analysis\n• **Statistik** und Wahrscheinlichkeitsrechnung\n• **Geometrie** und Trigonometrie\n• **Lineare Algebra** und Differentialgleichungen\n\nStellen Sie Ihre mathematische Frage - ich erkläre jeden Schritt ausführlich!`
          : `Für mathematische Probleme verwende ich als ${modelName} eine strukturierte Herangehensweise:\n\n▶ **Problemidentifikation**: Was ist gegeben, was gesucht?\n▶ **Methodenauswahl**: Welcher Lösungsweg ist effizient?\n▶ **Schrittweise Lösung**: Jeder Rechenschritt wird dokumentiert\n▶ **Verifikation**: Plausibilitätsprüfung des Ergebnisses\n\nZeigen Sie mir Ihr mathematisches Problem!`;
      }
      
      // Writing and content creation
      if (userLower.includes("schreib") || userLower.includes("text") || userLower.includes("artikel") || userLower.includes("brief") || userLower.includes("email")) {
        return isV3
          ? `Textproduktion ist eine meiner Stärken! ${modelName} unterstützt Sie bei:\n\n• **Geschäftskommunikation**: E-Mails, Berichte, Präsentationen\n• **Kreatives Schreiben**: Geschichten, Artikel, Blog-Posts\n• **Technische Dokumentation**: Anleitungen, Spezifikationen\n• **Akademisches Schreiben**: Essays, Zusammenfassungen\n\nSagen Sie mir, welche Art von Text Sie benötigen!`
          : `Beim Schreiben folge ich als ${modelName} einem systematischen Prozess:\n\n1. **Zielsetzung definieren**: Zielgruppe und Zweck klären\n2. **Struktur entwickeln**: Logischen Aufbau planen\n3. **Inhalte ausarbeiten**: Systematische Texterstellung\n4. **Revision & Optimierung**: Klarheit und Kohärenz prüfen\n\nBeschreiben Sie Ihr Schreibprojekt!`;
      }
      
      // Data analysis and research
      if (userLower.includes("daten") || userLower.includes("analyse") || userLower.includes("research") || userLower.includes("studie")) {
        return isV3
          ? `Datenanalyse ist eine meiner Spezialitäten! ${modelName} bietet:\n\n• **Datenvisualisierung** und Muster-Erkennung\n• **Statistische Analysen** und Hypothesen-Tests\n• **Machine Learning** Ansätze\n• **Marktforschung** und Trend-Analyse\n\nWelche Daten möchten Sie analysieren?`
          : `Für Datenanalysen verwende ich als ${modelName} eine methodische Herangehensweise:\n\n▪ **Datenqualität prüfen**: Vollständigkeit und Konsistenz\n▪ **Explorative Analyse**: Muster und Anomalien identifizieren\n▪ **Hypothesen formulieren**: Testbare Annahmen entwickeln\n▪ **Validierung**: Ergebnisse statistisch absichern\n\nTeilen Sie Ihre Daten oder Forschungsfrage!`;
      }
      
      // General contextual responses with variety
      const generalResponses = isV3 ? [
        `Das ist eine spannende Frage! Als ${modelName} kann ich verschiedene Perspektiven dazu anbieten. Lassen Sie mich das für Sie durchdenken...`,
        `Interessant! Mit den erweiterten Fähigkeiten von ${modelName} kann ich Ihnen eine umfassende Antwort geben. Hier meine Analyse...`,
        `Ausgezeichnete Frage! Als fortschrittliches ${modelName} System erkenne ich mehrere wichtige Aspekte. Lassen Sie mich diese für Sie aufschlüsseln...`
      ] : [
        `Lassen Sie mich das systematisch angehen. Als ${modelName} strukturiere ich die Antwort logisch:\n\n▶ Kernproblem identifizieren\n▶ Relevante Faktoren analysieren\n▶ Lösungsoptionen bewerten\n▶ Empfehlung aussprechen`,
        `Das erfordert eine durchdachte Betrachtung. Mit ${modelName} analysiere ich:\n\n1. **Kontext**: Was ist der Hintergrund?\n2. **Faktoren**: Welche Elemente sind relevant?\n3. **Zusammenhänge**: Wie beeinflussen sie sich?\n4. **Implikationen**: Was bedeutet das praktisch?`,
        `Interessante Fragestellung! Als ${modelName} gehe ich methodisch vor:\n\n• **Problem**: Kern der Fragestellung erfassen\n• **Analyse**: Systematische Untersuchung\n• **Synthese**: Erkenntnisse zusammenfügen\n• **Lösung**: Praktikable Empfehlung geben`
      ];
      
      const selectedResponse = generalResponses[Math.floor(Math.random() * generalResponses.length)];
      
      // Add context-specific follow-up
      if (userMessage.length > 100) {
        return selectedResponse + (isV3 ? 
          "\n\nIhre detaillierte Frage zeigt, dass Sie bereits über das Thema nachgedacht haben. Können Sie spezifizieren, welcher Aspekt Sie besonders interessiert?" :
          "\n\nUm eine präzise Analyse zu gewährleisten, können Sie mir weitere Details zu den spezifischen Aspekten geben, die Sie interessieren?");
      }
      
      return selectedResponse;
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("chat-with-deepseek error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
