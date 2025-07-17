import { useState, useEffect } from 'react';
import { Users, Search, Download, Pencil, X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface UserInfo {
  id: string;
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: string;
  created_at: string;
  verified: boolean;
  current_level?: number;
}

export default function UsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userDateFilter, setUserDateFilter] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [levelSavingId, setLevelSavingId] = useState<string | null>(null);
  const [levels, setLevels] = useState<{ level: number; name: string }[]>([]);

  // Fetch all users for client-side filtering/pagination
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase.from('user_info').select('*');
      if (error) {
        setUsers([]);
        toast({ title: t('common.error'), description: t('admin.noUsers'), variant: 'destructive' });
      } else {
        setUsers(data || []);
      }
      setLoadingUsers(false);
    };
    fetchUsers();
  }, [t]);

  // Fetch user count
  useEffect(() => {
    setUserCount(users.length);
  }, [users]);

  // Fetch levels for inline editing
  useEffect(() => {
    const fetchLevels = async () => {
      const { data, error } = await supabase.from('levels').select('level, name').order('level', { ascending: true });
      if (!error && data) setLevels(data);
    };
    fetchLevels();
  }, []);

  // Filtering logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = userSearchTerm === '' ||
      user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.phone?.includes(userSearchTerm);
    const matchesStatus = userStatusFilter === 'all' ||
      (userStatusFilter === 'verified' && user.verified) ||
      (userStatusFilter === 'pending' && !user.verified);
    const matchesDate = !userDateFilter ||
      format(new Date(user.created_at), 'yyyy-MM-dd') === format(userDateFilter, 'yyyy-MM-dd');
    return matchesSearch && matchesStatus && matchesDate;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, userStatusFilter, userDateFilter]);

  const handleView = (user: UserInfo) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleVerify = async (userId: string) => {
    const { error } = await supabase.from('user_info').update({ verified: true }).eq('id', userId);
    if (!error) {
      const { data } = await supabase.from('user_info').select('*');
      setUsers(data || []);
      toast({ title: t('common.success'), description: t('admin.userVerified') });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm(t('Are you sure you want to remove this user?'))) return;
    const { error } = await supabase.from('user_info').delete().eq('id', userId);
    if (!error) {
      const { data } = await supabase.from('user_info').select('*');
      setUsers(data || []);
      toast({ title: t('common.success'), description: t('admin.userRemoved') });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('admin.users')}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search and Filters */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder={t('admin.searchPlaceholder')}
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    {userSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setUserSearchTerm('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t('admin.verificationStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
                      <SelectItem value="verified">{t('admin.verified')}</SelectItem>
                      <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-48">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {userDateFilter ? format(userDateFilter, 'yyyy-MM-dd') : t('admin.registrationDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={userDateFilter}
                        onSelect={setUserDateFilter}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUserSearchTerm('');
                      setUserStatusFilter('all');
                      setUserDateFilter(undefined);
                    }}
                  >
                    {t('admin.clearFilters')}
                  </Button>
                </div>
              </div>
              {/* Users Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.users.name')}</TableHead>
                    <TableHead>{t('admin.users.email')}</TableHead>
                    <TableHead>{t('admin.users.phone')}</TableHead>
                    <TableHead>{t('admin.users.status')}</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>{t('admin.users.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('admin.loading')}
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        {t('admin.noUsers')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.phone}</TableCell>
                        <TableCell>
                          <Badge className={user.verified ? 'bg-success' : 'bg-warning'}>
                            {user.verified ? t('admin.users.verified') : t('admin.users.pending')}
                          </Badge>
                        </TableCell>
                        <TableCell
                          onClick={() => {
                            if (editingId === null) setEditingId(user.id);
                          }}
                          style={{ cursor: editingId === null ? 'pointer' : 'default', background: editingId === user.id ? 'rgba(0, 128, 255, 0.08)' : undefined, borderRadius: editingId === user.id ? 6 : undefined, border: editingId === user.id ? '1px solid #2196f3' : undefined }}
                        >
                          {editingId === user.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={user.current_level?.toString() || ''}
                                onValueChange={async (val) => {
                                  setLevelSavingId(user.id);
                                  const newLevel = parseInt(val, 10);
                                  const { error } = await supabase
                                    .from('user_info')
                                    .update({ current_level: newLevel })
                                    .eq('id', user.id);
                                  if (!error) {
                                    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, current_level: newLevel } : u));
                                    toast({ title: t('common.success'), description: 'Level updated!' });
                                  } else {
                                    toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
                                  }
                                  setLevelSavingId(null);
                                  setEditingId(null);
                                }}
                                disabled={levelSavingId === user.id}
                              >
                                <SelectTrigger className="w-32" autoFocus tabIndex={0}>
                                  {levels.find((lvl) => lvl.level === user.current_level)?.name || user.current_level || '-'}
                                </SelectTrigger>
                                <SelectContent>
                                  {levels.map((lvl) => (
                                    <SelectItem key={lvl.level} value={lvl.level.toString()}>{lvl.name || `Level ${lvl.level}`}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                                {t('common.cancel') || 'Cancel'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{levels.find((lvl) => lvl.level === user.current_level)?.name || user.current_level || '-'}</span>
                              <Pencil className="w-4 h-4 text-muted-foreground cursor-pointer" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleView(user)}>
                              {t('common.edit')}
                            </Button>
                            {!user.verified && (
                              <Button size="sm" className="bg-success" onClick={() => handleVerify(user.id)}>
                                {t('admin.verify')}
                              </Button>
                            )}
                            <Button variant="destructive" size="sm" onClick={() => handleRemove(user.id)}>
                              {t('common.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {/* Pagination */}
              {filteredUsers.length > itemsPerPage && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <PaginationItem key={i + 1}>
                          <PaginationLink
                            onClick={() => setCurrentPage(i + 1)}
                            isActive={currentPage === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('User Details')}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <label className="font-medium">{t('admin.users.name')}:</label>
                <p>{`${selectedUser.first_name} ${selectedUser.last_name}`}</p>
              </div>
              <div>
                <label className="font-medium">{t('admin.users.email')}:</label>
                <p>{selectedUser.email}</p>
              </div>
              <div>
                <label className="font-medium">{t('admin.users.phone')}:</label>
                <p>{selectedUser.phone}</p>
              </div>
              <div>
                <label className="font-medium">{t('admin.users.status')}:</label>
                <p>{selectedUser.verified ? t('admin.users.verified') : t('admin.users.pending')}</p>
              </div>
              <div>
                <label className="font-medium">{t('admin.registrationDate')}:</label>
                <p>{format(new Date(selectedUser.created_at), 'PPP')}</p>
              </div>
              <div>
                <label className="font-medium">Level:</label>
                <p>{levels.find((lvl) => lvl.level === selectedUser.current_level)?.name || selectedUser.current_level || '-'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 