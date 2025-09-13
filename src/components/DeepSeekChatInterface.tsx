import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ModelNavigation from "./ModelNavigation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type SupportedKind = "image" | "pdf" | "docx" | "txt";

interface AttachmentItem {
  id: string;
  file: File;
  kind: SupportedKind;
  previewUrl?: string;
  dataUrl?: string;
  extractedText?: string;
}

interface DeepSeekChatInterfaceProps {
  model: "deepseek-v3" | "deepseek-r1";
}

const DeepSeekChatInterface = ({ model }: DeepSeekChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: model === "deepseek-v3" 
        ? "Hallo! Ich bin ein KI-Chatbot, der von DeepSeek V3 betrieben wird."
        : "Hallo! Ich bin ein KI-Chatbot, der von DeepSeek R1 betrieben wird.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const pickFiles = () => fileInputRef.current?.click();

  const detectKind = (file: File): SupportedKind | null => {
    const type = file.type;
    if (type.startsWith("image/")) return "image";
    if (type === "application/pdf") return "pdf";
    if (
      type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.toLowerCase().endsWith(".docx")
    )
      return "docx";
    if (type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) return "txt";
    return null;
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      console.log('Starting PDF text extraction for:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF ArrayBuffer size:', arrayBuffer.byteLength);
      
      const pdfjs = await import("pdfjs-dist/build/pdf");
      
      // Use CDN worker for proper PDF processing (this might trigger IDM but works correctly)
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      console.log('PDF loaded, pages:', pdf.numPages);
      
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        const pageText = content.items
          .map((item: any) => {
            if (item.str && typeof item.str === 'string') {
              return item.str;
            }
            return '';
          })
          .filter(str => str.trim().length > 0)
          .join(' ');
        
        if (pageText.trim()) {
          text += (i > 1 ? '\n\n=== Seite ' + i + ' ===\n' : '=== Seite ' + i + ' ===\n') + pageText;
        }
      }
      
      console.log('PDF text extraction completed. Total length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));
      return text;
    } catch (e) {
      console.error("PDF parse error details:", e);
      // Fallback: return a message indicating PDF was uploaded but couldn't be processed
      const fallbackText = `PDF-Datei "${file.name}" wurde hochgeladen, aber der Text konnte nicht extrahiert werden. Bitte beschreiben Sie den Inhalt oder stellen Sie Ihre Frage zum PDF.`;
      console.log('Using fallback text for PDF:', fallbackText);
      return fallbackText;
    }
  };

  const extractDocxText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const mammoth: any = await import("mammoth/mammoth.browser");
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result?.value || "";
    } catch (e) {
      console.error("DOCX parse error", e);
      return "";
    }
  };

  const onFilesSelected = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const files = evt.target.files;
    if (!files) return;
    const newItems: AttachmentItem[] = [];

    console.log(`Processing ${files.length} files...`);

    for (const file of Array.from(files)) {
      console.log(`Processing file: ${file.name}, type: ${file.type}`);
      const kind = detectKind(file);
      if (!kind) {
        alert(`Nicht unterstützte Datei: ${file.name}`);
        continue;
      }
      const id = `${file.name}-${file.size}-${Date.now()}`;

      try {
        if (kind === "image") {
          const previewUrl = URL.createObjectURL(file);
          const dataUrl = await readAsDataUrl(file);
          newItems.push({ id, file, kind, previewUrl, dataUrl });
          console.log(`Image processed: ${file.name}`);
        } else if (kind === "pdf") {
          console.log(`Extracting text from PDF: ${file.name}`);
          const extractedText = await extractPdfText(file);
          console.log(`PDF text extracted (${extractedText.length} chars): ${file.name}`);
          newItems.push({ id, file, kind, extractedText });
        } else if (kind === "docx") {
          console.log(`Extracting text from DOCX: ${file.name}`);
          const extractedText = await extractDocxText(file);
          console.log(`DOCX text extracted (${extractedText.length} chars): ${file.name}`);
          newItems.push({ id, file, kind, extractedText });
        } else if (kind === "txt") {
          console.log(`Reading text file: ${file.name}`);
          const extractedText = await file.text();
          console.log(`Text file read (${extractedText.length} chars): ${file.name}`);
          newItems.push({ id, file, kind, extractedText });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        alert(`Fehler beim Verarbeiten der Datei ${file.name}: ${error}`);
      }
    }

    console.log(`Added ${newItems.length} attachments`);
    setAttachments((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const callDeepSeekAPI = async (messages: any[], selectedModel: string): Promise<string> => {
    const apiKey = selectedModel === "deepseek-v3" 
      ? import.meta.env.VITE_DEEPSEEK_V3_API_KEY 
      : import.meta.env.VITE_DEEPSEEK_R1_API_KEY;

    if (!apiKey) {
      throw new Error(`API key not found for ${selectedModel}`);
    }

    // OpenRouter model names for DeepSeek models
    const actualModel = selectedModel === "deepseek-v3" 
      ? "deepseek/deepseek-chat" 
      : "deepseek/deepseek-r1";
    
    const systemPrompt = selectedModel === "deepseek-v3" 
      ? "You are DeepSeek V3, a helpful AI assistant. Always respond in the same language as the user's input. If the user writes in German, respond in German. If they write in English, respond in English. If they write in Urdu, Hindi, or any other language, respond in that same language. Match the user's language exactly."
      : "You are DeepSeek R1, a reasoning-focused AI assistant. Always respond in the same language as the user's input. If the user writes in German, respond in German. If they write in English, respond in English. If they write in Urdu, Hindi, or any other language, respond in that same language. Match the user's language exactly.";

    const requestBody = {
      model: actualModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    };

    console.log("Making API call to OpenRouter for DeepSeek:", { model: actualModel, messageCount: requestBody.messages.length });
    console.log("Full request body:", JSON.stringify(requestBody, null, 2));
    console.log("Last message content:", requestBody.messages[requestBody.messages.length - 1]?.content?.substring(0, 500));

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "DeepSeek Deutsch Chatbot"
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API Error:", response.status, errorText);
      throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenRouter API Success:", { usage: data.usage });
    
    return data?.choices?.[0]?.message?.content || "Entschuldigung, ich konnte keine Antwort generieren.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim().length === 0 && attachments.length === 0) || isLoading) return;

    const userMsg: ChatMessage = {
      id: `${Date.now()}`,
      role: "user",
      content: input.trim() || (attachments.length ? "[Anhang hinzugefügt]" : ""),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const outgoing: any[] = messages.map((m) => ({ role: m.role, content: m.content }));

      let finalContent = userMsg.content;

      // Add extracted text from files
      const docText = attachments
        .filter((a) => a.kind !== "image" && a.extractedText)
        .map((a) => `\n\n--- Datei: ${a.file.name} ---\n${a.extractedText}`)
        .join("\n\n");
      
      console.log(`Found ${attachments.length} attachments`);
      console.log('Attachments:', attachments.map(a => ({ name: a.file.name, kind: a.kind, hasText: !!a.extractedText })));
      
      if (docText) {
        finalContent += docText; // No word count restriction - process full document
        console.log('Added document text to message (full content)');
      }

      // For images, we'll just mention them for now
      const imageFiles = attachments.filter((a) => a.kind === "image");
      if (imageFiles.length > 0) {
        finalContent += `\n\n[${imageFiles.length} Bild(er) angehängt: ${imageFiles.map(f => f.file.name).join(", ")}]`;
      }

      console.log('Final message content length:', finalContent.length);
      outgoing.push({ role: "user", content: finalContent });

      // Make direct API call to DeepSeek
      const replyText = await callDeepSeekAPI(outgoing, model);
      
      const aiMessage: ChatMessage = {
        id: `${Date.now() + 1}`,
        role: "assistant",
        content: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: `${Date.now() + 1}`,
        role: "assistant",
        content: `Fehler: ${err instanceof Error ? err.message : "Anfrage fehlgeschlagen"}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setAttachments([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="deepseek-chat-wrapper">
      <div className="deepseek-chat-bg h-[600px] flex flex-col">
        {/* Header with Model Tabs */}
        <ModelNavigation />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-3 text-sm",
                  message.role === "user"
                    ? "deepseek-message-user text-white"
                    : "deepseek-message-assistant"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="deepseek-message-assistant px-4 py-3 text-sm flex items-center">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Denkt nach...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {attachments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-md border bg-gray-50 px-2 py-1"
                >
                  {a.kind === "image" ? (
                    <img src={a.previewUrl} alt={a.file.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <span className="text-xs text-gray-600">{a.file.name}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.docx,text/plain,.txt"
              onChange={onFilesSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={pickFiles}
              disabled={isLoading}
              className="deepseek-file-button shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Schreiben Sie eine Nachricht"
              className="deepseek-input min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading} className="deepseek-send-button shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="px-4 pb-2">
          <p className="text-xs text-center text-gray-500">Powered by DeepSeek API</p>
        </div>
      </div>
    </div>
  );
};

export default DeepSeekChatInterface;
