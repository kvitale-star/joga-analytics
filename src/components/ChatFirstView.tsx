import React, { useState, useRef, useEffect } from 'react';
import { MatchData, SheetConfig } from '../types';
import { chatWithAI, refreshAIConfigured } from '../services/aiService';
import { ChatMessage } from './ChatMessage';
import { ChartData } from './ChartRenderer';
import { WelcomeMessage } from './WelcomeMessage';
import { UserMenu } from './UserMenu';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartData[];
}

interface ChatFirstViewProps {
  matchData: MatchData[];
  columnKeys: string[];
  sheetConfig?: SheetConfig;
}

export const ChatFirstView: React.FC<ChatFirstViewProps> = ({ matchData, columnKeys, sheetConfig }) => {
  const [aiConfigured, setAiConfigured] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check AI configuration status on mount
  useEffect(() => {
    const checkAIConfig = async () => {
      const configured = await refreshAIConfigured();
      setAiConfigured(configured);
    };
    
    checkAIConfig();
  }, []);

  
  const handleSendQuestion = async (question: string) => {
    if (!question.trim() || isLoading || !aiConfigured) return;

    const userMessage: Message = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const newMessages = showWelcome ? [userMessage] : [...prev, userMessage];
      setShowWelcome(false);
      return newMessages;
    });
    setInput('');
    setIsLoading(true);
    setStatusMessage('Processing your request...');

    try {
      const response = await chatWithAI(
        question.trim(), 
        matchData, 
        columnKeys, 
        sheetConfig,
        (status: string) => {
          setStatusMessage(status);
        }
      );
      setStatusMessage('');
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `**Error:** ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuestionClick = (question: string) => {
    setInput(question);
    setShowWelcome(false);
    // Focus and send after a brief delay to allow state updates
    setTimeout(() => {
      inputRef.current?.focus();
      handleSendQuestion(question);
    }, 100);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showWelcome]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !aiConfigured) return;
    
    setShowWelcome(false);
    handleSendQuestion(input.trim());
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">JOGA Analytics AI</h1>
              <p className="text-sm text-gray-600 mt-1">AI-Powered Match Data Analysis</p>
            </div>
            <div className="relative">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-6xl mx-auto w-full">
          {!aiConfigured ? (
            <div className="bg-white rounded-lg p-6 border border-red-200 shadow-sm">
              <div className="text-red-600 font-semibold mb-2">⚠️ AI service is not configured</div>
              <p className="text-gray-600">
                Please add <code className="bg-gray-100 px-1 rounded">GEMINI_API_KEY</code> to the backend <code className="bg-gray-100 px-1 rounded">.env</code> file to enable the chatbot.
              </p>
            </div>
          ) : showWelcome && messages.length === 0 ? (
            <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
              <WelcomeMessage 
                matchData={matchData}
                columnKeys={columnKeys}
                onQuestionClick={handleQuestionClick}
              />
            </div>
          ) : (
            <>
              {messages.map((message, idx) => (
                <ChatMessage
                  key={idx}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                  charts={message.charts}
                />
              ))}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm max-w-2xl">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                      {statusMessage && (
                        <span className="text-sm text-gray-600">{statusMessage}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={aiConfigured ? "Ask about your match data..." : "AI service not configured"}
              disabled={isLoading || !aiConfigured}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !aiConfigured}
              className="px-6 py-3 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              style={{
                backgroundColor: isLoading || !input.trim() || !aiConfigured 
                  ? '#d1d5db' 
                  : '#ceff00', // Nike Volt Yellow
                color: isLoading || !input.trim() || !aiConfigured
                  ? '#6b7280'
                  : '#000000', // Black text on Volt Yellow
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim() && aiConfigured) {
                  e.currentTarget.style.backgroundColor = '#b8e600'; // Darker Volt Yellow
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && input.trim() && aiConfigured) {
                  e.currentTarget.style.backgroundColor = '#ceff00'; // Volt Yellow
                }
              }}
            >
              Send
            </button>
          </div>
          {!aiConfigured && (
            <p className="text-xs text-gray-500 mt-2">
              AI service requires GEMINI_API_KEY in backend .env file. Contact your administrator.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

