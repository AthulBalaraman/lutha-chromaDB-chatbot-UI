
import { useState, useRef, useEffect } from "react";
import { configureStore, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Provider, useDispatch, useSelector } from "react-redux";
import { Send, FileText, CheckCircle2, Loader2, ChevronLeft, ChevronRight, UploadCloud } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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
  uri: string;
}

interface ChatState {
  messages: Message[];
  isProcessing: boolean;
  documents: Document[];
  isIndexing: boolean;
  indexedCount: number;
}

interface Document {
  id: string;
  name: string;
  status: "indexed" | "pending";
}

// Redux Slice
const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [],
    isProcessing: false,
    documents: [],
    isIndexing: false,
    indexedCount: 0,
  } as ChatState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
        state.messages = action.payload;
    },
    setIsProcessing: (state, action: PayloadAction<boolean>) => {
      state.isProcessing = action.payload;
    },
    setDocuments: (state, action: PayloadAction<Document[]>) => {
      state.documents = action.payload;
    },
    setIsIndexing: (state, action: PayloadAction<boolean>) => {
      state.isIndexing = action.payload;
    },
    setIndexedCount: (state, action: PayloadAction<number>) => {
      state.indexedCount = action.payload;
    },
  },
});

const { addMessage, setMessages, setIsProcessing, setDocuments, setIsIndexing, setIndexedCount } = chatSlice.actions;

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

// API Functions
const getStatus = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/status`);
  return response.data;
};

const getDocuments = async () => {
  const response = await axios.get(`${API_BASE_URL}/api/v1/documents`);
  return response.data;
};

const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.post(`${API_BASE_URL}/api/v1/upload-document`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

const postChatMessage = async (query: string) => {
  const response = await axios.post(`${API_BASE_URL}/api/v1/chat`, { query });
  return response.data;
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
                  Source {idx + 1}: {source.title}
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
  const indexedCount = useSelector((state: RootState) => state.chat.indexedCount);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatusAndDocuments = async () => {
    try {
      const statusData = await getStatus();
      dispatch(setIndexedCount(statusData.indexed_count));
      const documentsData = await getDocuments();
      dispatch(setDocuments(documentsData));
    } catch (error) {
      console.error("Failed to fetch status or documents", error);
    }
  };

  useEffect(() => {
    fetchStatusAndDocuments();
    const interval = setInterval(fetchStatusAndDocuments, 180000); // Poll every 3 minutes
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    dispatch(setIsIndexing(true));
    try {
      await uploadDocument(file);
      await fetchStatusAndDocuments(); // Refresh data after upload
    } catch (error) {
      console.error("Failed to upload document", error);
    } finally {
      dispatch(setIsIndexing(false));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
              {indexedCount > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              ) : (
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              )}
            </div>
            <p className="text-lg font-bold text-foreground">
              {indexedCount} Documents Indexed
            </p>
            {indexedCount > 0 && (
              <p className="text-xs text-primary mt-1">✓ RAG Model Ready</p>
            )}
          </div>

          {/* Documents List */}
          <div className="flex-1 overflow-auto">
            <h3 className="text-sm font-semibold text-foreground mb-3">Indexed Documents</h3>
            <div className="space-y-2">
              {documents.length > 0 ? (
                documents.map((doc) => (
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
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No documents indexed yet.
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".txt,.pdf"
          />
          <button
            onClick={handleUploadClick}
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
                <UploadCloud className="w-4 h-4" />
                Upload Document
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

    try {
      const response = await postChatMessage(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response_text,
        sources: response.sources,
        timestamp: new Date(),
      };

      dispatch(addMessage(aiMessage));
    } catch (error) {
      console.error("Failed to send message", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the server. Please try again later.",
        timestamp: new Date(),
      };
      dispatch(addMessage(errorMessage));
    } finally {
      dispatch(setIsProcessing(false));
    }
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
                    Start by uploading a document. Then, ask questions and I'll provide answers with
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

