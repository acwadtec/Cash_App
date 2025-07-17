import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Components
import { AdminChat } from '@/components/AdminChat';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface ChatSession {
  id: string;
  user_id: string;
  user_name: string;
  status: 'active' | 'closed';
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function SupportPage() {
  const { t } = useLanguage();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChatSessions();
    // Subscribe to new messages
    const subscription = supabase
      .channel('chat_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, () => {
        fetchChatSessions();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [statusFilter]);

  const fetchChatSessions = async () => {
    try {
      setLoadingSessions(true);
      let query = supabase
        .from('chat_sessions')
        .select('*, users(name)')
        .order('last_message_time', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setChatSessions(data?.map(session => ({
        ...session,
        user_name: session.users.name
      })) || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch chat sessions'),
        variant: 'destructive',
      });
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ status: 'closed' })
        .eq('id', sessionId);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Chat session closed'),
      });
      fetchChatSessions();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to close chat session'),
        variant: 'destructive',
      });
    }
  };

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = searchTerm === '' || 
      session.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.last_message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Customer Support')}</h2>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="active">{t('Active')}</SelectItem>
            <SelectItem value="closed">{t('Closed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>{t('Chat Sessions')}</CardTitle>
              <Input
                placeholder={t('Search chats...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loadingSessions ? (
                  <div className="text-center py-4">{t('Loading...')}</div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-4">{t('No chat sessions found')}</div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedSession?.id === session.id
                          ? 'bg-primary/10'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedSession(session)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium">{session.user_name}</div>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status === 'active' ? t('Active') : t('Closed')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {session.last_message}
                      </div>
                      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{new Date(session.last_message_time).toLocaleString()}</span>
                        {session.unread_count > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {session.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {selectedSession ? (
                    <div className="flex items-center gap-2">
                      <span>{t('Chat with')} {selectedSession.user_name}</span>
                      <Badge variant={selectedSession.status === 'active' ? 'default' : 'secondary'}>
                        {selectedSession.status === 'active' ? t('Active') : t('Closed')}
                      </Badge>
                    </div>
                  ) : (
                    t('Select a chat session')
                  )}
                </CardTitle>
                {selectedSession?.status === 'active' && (
                  <Button
                    variant="outline"
                    onClick={() => handleCloseSession(selectedSession.id)}
                  >
                    {t('Close Chat')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedSession ? (
                <AdminChat />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-4" />
                  <p>{t('Select a chat session to start messaging')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 