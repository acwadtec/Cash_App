import { useState, useEffect } from 'react';
import { Users, Search, Download, Pencil } from 'lucide-react';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';
import { testUserInfoTable } from '@/lib/supabase';

interface UserInfo {
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  created_at: string;
  verified: boolean;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
    fetchUserCount();
  }, [userSearchTerm, userStatusFilter, currentPage]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      let query = supabase
        .from('user_info')
        .select('*')
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      if (userSearchTerm) {
        query = query.or(`email.ilike.%${userSearchTerm}%,first_name.ilike.%${userSearchTerm}%,last_name.ilike.%${userSearchTerm}%`);
      }

      if (userStatusFilter !== 'all') {
        query = query.eq('status', userStatusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch users'),
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserCount = async () => {
    try {
      let query = supabase.from('user_info').select('user_uid', { count: 'exact' });
      
      if (userSearchTerm) {
        query = query.or(`email.ilike.%${userSearchTerm}%,first_name.ilike.%${userSearchTerm}%,last_name.ilike.%${userSearchTerm}%`);
      }

      if (userStatusFilter !== 'all') {
        query = query.eq('status', userStatusFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      setUserCount(count || 0);
    } catch (error) {
      console.error('Error fetching user count:', error);
    }
  };

  const handleView = (user: UserInfo) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleVerify = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_info')
        .update({ verified: true })
        .eq('user_uid', userId);
      if (error) throw error;
      
      toast({
        title: t('Success'),
        description: t('User verified successfully'),
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to verify user'),
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm(t('Are you sure you want to remove this user?'))) return;
    
    try {
      const { error } = await supabase
        .from('user_info')
        .delete()
        .eq('user_uid', userId);
      if (error) throw error;
      
      toast({
        title: t('Success'),
        description: t('User removed successfully'),
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to remove user'),
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      const isConnected = await testUserInfoTable();
      if (isConnected) {
        toast({
          title: 'Connection Test',
          description: 'Successfully connected to user_info table. Check console for details.',
        });
      } else {
        toast({
          title: 'Connection Test',
          description: 'Failed to connect to user_info table. Check console for details.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Test',
        description: 'Error testing connection. Check console for details.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Users Management')}</h2>
        <div className="flex gap-2">
          <Button onClick={handleTestConnection} variant="outline">
            Test Connection
          </Button>
          <Button onClick={() => setShowExportModal(true)}>
            <Download className="mr-2 h-4 w-4" />
            {t('Export')}
          </Button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder={t('Search users...')}
          value={userSearchTerm}
          onChange={(e) => setUserSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('Filter by status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All')}</SelectItem>
            <SelectItem value="active">{t('Active')}</SelectItem>
            <SelectItem value="pending">{t('Pending')}</SelectItem>
            <SelectItem value="suspended">{t('Suspended')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Users List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Name')}</TableHead>
                <TableHead>{t('Email')}</TableHead>
                <TableHead>{t('Phone')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Joined')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {t('No users found')}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.user_uid}>
                    <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.status}</TableCell>
                    <TableCell>{format(new Date(user.created_at), 'PPP')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {!user.verified && (
                          <Button variant="outline" size="sm" onClick={() => handleVerify(user.user_uid)}>
                            {t('Verify')}
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => handleRemove(user.user_uid)}>
                          {t('Remove')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {users.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(prev => Math.max(1, prev - 1));
                      }}
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink>{currentPage}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(prev => prev + 1);
                      }}
                      aria-disabled={currentPage * itemsPerPage >= userCount}
                      className={currentPage * itemsPerPage >= userCount ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('User Details')}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="font-medium">{t('Name')}:</label>
                <p>{`${selectedUser.first_name} ${selectedUser.last_name}`}</p>
              </div>
              <div>
                <label className="font-medium">{t('Email')}:</label>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <label className="font-medium">{t('Phone')}:</label>
                <p>{selectedUser.phone}</p>
              </div>
              <div>
                <label className="font-medium">{t('Status')}:</label>
                <p>{selectedUser.status}</p>
              </div>
              <div>
                <label className="font-medium">{t('Joined')}:</label>
                <p>{format(new Date(selectedUser.created_at), 'PPP')}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 