import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, 
  Send, 
  Paperclip, 
  X, 
  Minimize2, 
  Maximize2,
  User,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: string;
  isRead: boolean;
  attachments?: string[];
}

interface ChatSupportProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  isMinimized: boolean;
  isAdmin?: boolean;
}

export function ChatSupport({ 
  isOpen, 
  onClose, 
  onMinimize, 
  isMinimized, 
  isAdmin = false 
}: ChatSupportProps) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [isAgentOnline, setIsAgentOnline] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const quickReplies = [
    t('chat.quickReply.deposit'),
    t('chat.quickReply.withdrawal'),
    t('chat.quickReply.account'),
    t('chat.quickReply.technical'),
    t('chat.quickReply.other')
  ];

  // Get user id from Supabase Auth
  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserId(userData?.user?.id || null);
    };
    getUser();
  }, []);

  // Fetch messages from Supabase
  const fetchMessages = async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', userId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.created_at,
        isRead: msg.is_read,
        attachments: msg.attachment_url ? [msg.attachment_url] : [],
      })));
    }
  };

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!userId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate connection status
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectionStatus('connected');
      setIsAgentOnline(Math.random() > 0.1); // 90% chance agent is online
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Add welcome message if no messages
  useEffect(() => {
    if (messages.length === 0 && isOpen && userId) {
      setMessages([{
        id: 'welcome',
        text: t('chat.welcome'),
        sender: 'admin',
        timestamp: new Date().toISOString(),
        isRead: true
      }]);
    }
  }, [isOpen, messages.length, t, userId]);

  // Mark unread admin messages as read when chat is opened
  useEffect(() => {
    if (isOpen && userId) {
      const markRead = async () => {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', userId)
          .eq('sender', 'admin')
          .eq('is_read', false);
        fetchMessages();
      };
      markRead();
    }
    // eslint-disable-next-line
  }, [isOpen, userId]);

  const sendMessage = async (text: string, attachments: string[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    if (!userId) return;
    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: userId,
        text: text.trim(),
        sender: 'user',
        sender_id: userId,
        is_read: false,
        attachment_url: attachments[0] || null,
      }
    ]);
    if (error) {
      toast({ title: t('common.error'), description: t('chat.error.message') });
    } else {
      setNewMessage('');
      fetchMessages();
    }
  };

  const handleSendMessage = () => {
    sendMessage(newMessage);
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    // (Optional) Implement file upload logic here
    toast({ title: t('common.error'), description: 'File upload not implemented yet.' });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className={`w-80 h-96 shadow-glow transition-all duration-300 ${
        isMinimized ? 'h-16' : ''
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-sm">{t('chat.title')}</CardTitle>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isAgentOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {isAgentOnline ? t('chat.online') : t('chat.offline')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onMinimize}
                className="w-6 h-6 p-0"
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="w-6 h-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex flex-col h-80">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        message.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs opacity-80">
                                <Paperclip className="w-3 h-3" />
                                <span>{attachment}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                        {message.sender === 'user' && (
                          <div className="flex items-center gap-1">
                            {message.isRead ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <Clock className="w-3 h-3 text-muted-foreground" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      message.sender === 'user' ? 'order-1 bg-primary' : 'order-2 bg-muted'
                    }`}>
                      {message.sender === 'user' ? (
                        <User className="w-3 h-3 text-primary-foreground" />
                      ) : (
                        <Shield className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-3 py-2">
                      <div className="flex items-center gap-1">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                        <span className="text-xs text-muted-foreground ml-2">{t('chat.typing')}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length === 1 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-2">{t('chat.quickReplies')}</p>
                  <div className="flex flex-wrap gap-1">
                    {quickReplies.map((reply, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickReply(reply)}
                        className="text-xs h-6 px-2"
                      >
                        {reply}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 p-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={t('chat.placeholder')}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf"
        />
      </Card>
    </div>
  );
} 