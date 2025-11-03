import { useState, useRef, useEffect } from "react";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Send, FileText, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface Source {
  title: string;
  reference: string;
}

interface ChatState {
  messages: Message[];
  isProcessing: boolean;
  documents: Document[];
  isIndexing: boolean;
}

interface Document {
  id: string;
  name: string;
  status: "indexed" | "pending";
}

// Mock documents
const MOCK_DOCUMENTS: Document[] = [
  { id: "1", name: "Q3 Financial Report", status: "indexed" },
  { id: "2", name: "Customer Service Manual", status: "indexed" },
  { id: "3", name: "Product Specifications", status: "indexed" },
  { id: "4", name: "CEO Transcript 2024", status: "indexed" },
  { id: "5", name: "Market Analysis Report", status: "indexed" },
];

// Redux Slice
const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
    isProcessing: false,
    documents: MOCK_DOCUMENTS,
    isIndexing: false,
  } as ChatState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setIsProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setIsIndexing: (state, action: PayloadAction<boolean>) => {
      state.isIndexing = action.payload;
    },
    simulateIndexing: (state) => {
      state.documents = state.documents.map((doc) => ({
        ...doc,
        status: "indexed" as const,
      }));
    },
  },
});

const { addMessage, setIsProcessing, setIsIndexing, simulateIndexing } = chatSlice.actions;

// Redux Store
const store = configureStore({
  reducer: {
    chat: chatSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

type RootState = ReturnType<typeof store.getState>;

// Mock RAG Response Generator
const generateMockResponse = (query: string): { content: string; sources: Source[] } => {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("revenue") || lowerQuery.includes("q3") || lowerQuery.includes("financial")) {
    return {
      content:
        "Based on our Q3 Financial Report, revenue increased by 23% year-over-year, reaching $4.2M in total revenue. The growth was primarily driven by our enterprise segment, which saw a 35% increase. Our customer acquisition cost decreased by 15%, while customer lifetime value increased by 20%.",
      sources: [
        { title: "Q3 Financial Report", reference: "Page 12, Section 3.2" },
        { title: "Market Analysis Report", reference: "Page 8" },
      ],
    };
  }

  if (lowerQuery.includes("contact") || lowerQuery.includes("support") || lowerQuery.includes("customer")) {
    return {
      content:
        "Our customer support team is available 24/7 through multiple channels. You can reach us via email at support@company.com, phone at 1-800-SUPPORT, or through our live chat. According to our service manual, average response time is under 2 hours for email inquiries and immediate for live chat.",
      sources: [
        { title: "Customer Service Manual", reference: "Chapter 2, Contact Information" },
        { title: "Product Specifications", reference: "Support Section" },
      ],
    };
  }

  if (lowerQuery.includes("product") || lowerQuery.includes("feature") || lowerQuery.includes("specification")) {
    return {
      content:
        "Our product suite includes three main offerings: Enterprise Platform (with advanced analytics and API access), Professional Plan (with team collaboration features), and Starter Plan (ideal for small teams). Each plan includes 99.9% uptime guarantee, real-time data synchronization, and dedicated support.",
      sources: [
        { title: "Product Specifications", reference: "Overview, Pages 1-5" },
        { title: "CEO Transcript 2024", reference: "Product Roadmap Discussion" },
      ],
    };
  }

  return {
    content:
      "I can only provide information based on the indexed documents. Please ask questions related to our Q3 financial performance, customer support procedures, or product specifications. Feel free to rephrase your question to match the available document corpus.",
    sources: [],
  };
};

// Chat Message Component
const ChatMessage = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[80%] ${isUser ? "order-2" : "order-1"}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-chat-user text-white shadow-md"
              : "bg-chat-ai border border-border shadow-sm"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2 bg-grounding-bg rounded-lg px-3 py-2 border border-primary-light">
            <div className="flex items-center gap-1 mb-1">
              <FileText className="w-3 h-3 text-primary" />
              <span className="text-xs font-semibold text-primary">Grounding Sources:</span>
            </div>
            <div className="flex flex-col gap-1">
              {message.sources.map((source, idx) => (
                <button
                  key={idx}
                  className="text-xs text-primary hover:text-primary-hover underline text-left transition-colors"
                >
                  Source {idx + 1}: {source.title} ({source.reference})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-1 px-1">
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
};

// Document Status Panel Component
const DocumentStatusPanel = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => {
  const dispatch = useDispatch();
  const documents = useSelector((state: RootState) => state.chat.documents);
  const isIndexing = useSelector((state: RootState) => state.chat.isIndexing);

  const handleIndexDocuments = () => {
    dispatch(setIsIndexing(true));
    setTimeout(() => {
      dispatch(simulateIndexing());
      dispatch(setIsIndexing(false));
    }, 2000);
  };

  const indexedCount = documents.filter((d) => d.status === "indexed").length;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 bg-card border border-border rounded-lg p-2 shadow-lg hover:bg-secondary transition-colors"
      >
        {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Panel */}
      <div
        className={`fixed lg:relative top-0 left-0 h-full bg-card border-r border-border transition-all duration-300 z-40 ${
          isOpen ? "translate-x-0 w-80" : "-translate-x-full lg:translate-x-0 lg:w-80"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-1">Document Grounding</h2>
            <p className="text-sm text-muted-foreground">RAG Knowledge Base</p>
          </div>

          {/* Status Card */}
          <div className="bg-primary-light rounded-lg p-4 mb-6 border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-primary">Status</span>
              {indexedCount === documents.length ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
            </div>
            <p className="text-lg font-bold text-foreground">
              {indexedCount}/{documents.length} Documents Indexed
            </p>
            {indexedCount === documents.length && (
              <p className="text-xs text-primary mt-1">✓ RAG Model Ready</p>
            )}
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3">Indexed Documents</h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border hover:border-primary/30 transition-colors"
                >
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  </div>
                  {doc.status === "indexed" && (
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Index Button */}
          <button
            onClick={handleIndexDocuments}
            disabled={isIndexing}
            className="mt-6 w-full bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg px-4 py-3 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isIndexing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Indexing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Re-index Documents
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}
    </>
  );
};

// Main Chat Interface Component
const ChatInterface = () => {
  const dispatch = useDispatch();
  const messages = useSelector((state: RootState) => state.chat.messages);
  const isProcessing = useSelector((state: RootState) => state.chat.isProcessing);
  
  const [input, setInput] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isProcessing) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    dispatch(addMessage(userMessage));
    setInput("");
    dispatch(setIsProcessing(true));

    // Simulate API call with delay
    setTimeout(() => {
      const { content, sources } = generateMockResponse(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content,
        sources,
        timestamp: new Date(),
      };

      dispatch(addMessage(aiMessage));
      dispatch(setIsProcessing(false));
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <DocumentStatusPanel isOpen={isPanelOpen} onToggle={() => setIsPanelOpen(!isPanelOpen)} />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground">RAG Q&A Assistant</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Ask questions about your indexed documents
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Welcome to RAG Q&A
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    Start asking questions about your indexed documents. I'll provide answers with
                    references to the source materials.
                  </p>
                  <div className="bg-secondary rounded-lg p-4 text-left">
                    <p className="text-sm font-semibold text-foreground mb-2">Try asking:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• "What was the Q3 revenue?"</li>
                      <li>• "How do I contact customer support?"</li>
                      <li>• "What are the product features?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {isProcessing && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-chat-ai border border-border rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Searching documents...
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card px-6 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask a question about your documents..."
                  disabled={isProcessing}
                  rows={1}
                  className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: "48px", maxHeight: "120px" }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isProcessing}
                className="bg-primary hover:bg-primary-hover text-primary-foreground rounded-lg p-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Root Component with Redux Provider
const Index = () => {
  return (
    <Provider store={store}>
      <ChatInterface />
    </Provider>
  );
};

export default Index;
