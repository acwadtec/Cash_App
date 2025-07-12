import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { 
  MessageCircle, 
  Send, 
  User, 
  Shield, 
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  timestamp: string;
  isRead: boolean;
}

interface Conversation {
  conversation_id: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  userName: string;
  userEmail: string;
}

export function AdminChat() {
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved' | 'pending'>('all');
  const [userInfoMap, setUserInfoMap] = useState<Record<string, {userName: string, userEmail: string}>>({});

  // Fetch all conversations (group by conversation_id)
  const fetchConversations = async () => {
    // Fallback: get all messages, group by conversation_id
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      // Get user info for each conversation
      const userIds = Array.from(new Set(data.map((msg: any) => msg.conversation_id)));
      const { data: users } = await supabase.from('user_info').select('user_uid, first_name, last_name, email').in('user_uid', userIds);
      const userMap: Record<string, {userName: string, userEmail: string}> = {};
      users?.forEach((u: any) => {
        userMap[u.user_uid] = {
          userName: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email,
          userEmail: u.email
        };
      });
      setUserInfoMap(userMap);
      // Group by conversation_id
      const convMap: Record<string, any[]> = {};
      data.forEach((msg: any) => {
        if (!convMap[msg.conversation_id]) convMap[msg.conversation_id] = [];
        convMap[msg.conversation_id].push(msg);
      });
      const convs: Conversation[] = Object.entries(convMap).map(([cid, msgs]) => {
        const lastMsg = msgs[0];
        return {
          conversation_id: cid,
          lastMessage: lastMsg.text,
          lastMessageTime: lastMsg.created_at,
          unreadCount: msgs.filter((m: any) => m.sender === 'user' && !m.is_read).length,
          userName: userMap[cid]?.userName || cid,
          userEmail: userMap[cid]?.userEmail || '',
        };
      });
      setConversations(convs);
    }
  };

  // Fetch messages for selected conversation
  const fetchMessages = async () => {
    if (!selectedConversationId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConversationId)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setMessages(data.map((msg: any) => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.created_at,
        isRead: msg.is_read,
      })));
    }
  };

  // Poll for new conversations/messages
  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedConversationId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId) return;
    const { error } = await supabase.from('messages').insert([
      {
        conversation_id: selectedConversationId,
        text: newMessage.trim(),
        sender: 'admin',
        is_read: false,
      }
    ]);
    if (!error) {
      setNewMessage('');
      fetchMessages();
      fetchConversations();
    }
  };

  const formatTime = (date: string) => {
    const now = new Date();
    const d = new Date(date);
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `${minutes} د`;
    if (hours < 24) return `${hours} س`;
    return `${days} يوم`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Conversations List */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            {t('admin.chat')}
          </CardTitle>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="البحث في المحادثات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
          {conversations
            .filter(conv => conv.userName.toLowerCase().includes(searchTerm.toLowerCase()) || conv.userEmail.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((conversation) => (
            <div
              key={conversation.conversation_id}
              onClick={() => setSelectedConversationId(conversation.conversation_id)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                selectedConversationId === conversation.conversation_id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {conversation.userName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium truncate">{conversation.userName}</h4>
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{formatTime(conversation.lastMessageTime)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {conversation.userEmail}
                    </span>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat Messages */}
      <Card className="lg:col-span-2">
        {selectedConversationId ? (
          <>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback>
                    {userInfoMap[selectedConversationId]?.userName?.split(' ').map(n => n[0]).join('') || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{userInfoMap[selectedConversationId]?.userName || selectedConversationId}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {userInfoMap[selectedConversationId]?.userEmail || ''}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col h-[calc(100vh-350px)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[70%] ${message.sender === 'admin' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-lg px-3 py-2 ${
                        message.sender === 'admin'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm">{message.text}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.timestamp)}
                        </span>
                        {message.sender === 'admin' && (
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
                      message.sender === 'admin' ? 'order-1 bg-primary' : 'order-2 bg-muted'
                    }`}>
                      {message.sender === 'admin' ? (
                        <Shield className="w-3 h-3 text-primary-foreground" />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="اكتب رسالتك..."
                  className="flex-1"
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-[calc(100vh-350px)]">
            <div className="text-center text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>اختر محادثة لعرض الرسائل</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
} 