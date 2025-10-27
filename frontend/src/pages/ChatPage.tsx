import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, Bot, User, Trash2, RotateCcw } from 'lucide-react';
import { apiService } from '../lib/api';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: string;
  session_id: string;
}

export const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState('default');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens iniciais
  useEffect(() => {
    loadMessages();
  }, []);

  // Scroll para a última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getChatMessages(sessionId);
      
      if (response.success) {
        const formattedMessages: Message[] = response.messages.map((msg: ChatMessage) => ({
          id: msg.id,
          text: msg.message,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      // Adicionar mensagem de boas-vindas se não houver mensagens
      if (messages.length === 0) {
        setMessages([{
          id: '1',
          text: 'Olá! Como posso te ajudar com o sistema de propostas hoje?',
          sender: 'bot',
          timestamp: new Date(),
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await apiService.sendChatMessage(currentInput, sessionId);
      
      if (response.success) {
        const botMessage: Message = {
          id: response.bot_response.id,
          text: response.bot_response.message,
          sender: 'bot',
          timestamp: new Date(response.bot_response.timestamp),
        };
        
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await apiService.clearChatSession(sessionId);
      setMessages([{
        id: '1',
        text: 'Chat limpo! Como posso te ajudar com o sistema de propostas hoje?',
        sender: 'bot',
        timestamp: new Date(),
      }]);
    } catch (error) {
      console.error('Erro ao limpar chat:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chat de Suporte</h1>
        <p className="text-sm text-gray-500">Sistema de suporte técnico para suas dúvidas sobre o sistema</p>
      </div>

      <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Chat Header */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Chat de Suporte</h3>
            <p className="text-sm text-gray-500">Sistema de Propostas - Suporte Técnico</p>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Limpar chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={loadMessages}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Recarregar mensagens"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-green-600">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.sender === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gray-600'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-2 max-w-xs lg:max-w-md">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-600">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-900">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  );
};