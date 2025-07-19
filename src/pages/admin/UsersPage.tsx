import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { supabase, optimizedQuery, clearCache } from '@/lib/supabase';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Search, Filter, Edit, Save, X, Users, UserCheck, UserX, RefreshCw, Download, FileText, FileSpreadsheet, FileDown, Eye, Shield, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface UserInfo {
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  wallet: string;
  verified: boolean;
  role: string;
  created_at: string;
  referral_code: string;
  referred_by: string;
  referral_count: number;
  total_referral_points: number;
  balance: number;
  total_points: number;
  bonuses: number;
  team_earnings: number;
  level: number;
  is_verified: boolean;
  withdrawal_limit_start?: string;
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
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // Memoized filtered and paginated users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Search filter
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchLower) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower) ||
        user.wallet?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (userStatusFilter !== 'all') {
      filtered = filtered.filter(user => user.verified === (userStatusFilter === 'verified'));
    }

    // Date filter
    if (userDateFilter) {
      const filterDate = format(userDateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter(user => 
        user.created_at.startsWith(filterDate)
      );
    }

    return filtered;
  }, [users, userSearchTerm, userStatusFilter, userDateFilter]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Optimized fetch users function with caching
  const fetchUsers = useCallback(async () => {
    const now = Date.now();
    // Only fetch if data is older than 2 minutes
    if (now - lastFetchTime < 2 * 60 * 1000 && users.length > 0) {
      return;
    }

    setLoadingUsers(true);
    try {
      const { data, error } = await optimizedQuery<UserInfo[]>(
        'user_info',
        {},
        { ttl: 2 * 60 * 1000, select: '*' }
      );

      if (error) {
        console.error('Error fetching users:', error);
        toast({ title: t('common.error'), description: t('admin.noUsers'), variant: 'destructive' });
        setUsers([]);
      } else {
        setUsers(data || []);
        setLastFetchTime(now);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: t('common.error'), description: t('admin.noUsers'), variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [lastFetchTime, users.length, t]);

  // Fetch user count
  useEffect(() => {
    setUserCount(filteredUsers.length);
  }, [filteredUsers]);

  // Fetch levels for inline editing
  useEffect(() => {
    const fetchLevels = async () => {
      const { data, error } = await optimizedQuery<{ level: number; name: string }[]>(
        'levels',
        {},
        { ttl: 10 * 60 * 1000, select: 'level, name' }
      );
      if (!error && data) {
        setLevels(data.sort((a, b) => a.level - b.level));
      }
    };
    fetchLevels();
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle level editing
  const handleLevelEdit = (userId: string, currentLevel: number) => {
    setEditingId(userId);
  };

  const handleLevelSave = async (userId: string, newLevel: number) => {
    setLevelSavingId(userId);
    try {
      const { error } = await supabase
        .from('user_info')
        .update({ level: newLevel })
        .eq('user_uid', userId);

      if (error) {
        toast({ title: t('common.error'), description: t('admin.failedToUpdateLevel'), variant: 'destructive' });
      } else {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.user_uid === userId ? { ...user, level: newLevel } : user
        ));
        toast({ title: t('common.success'), description: t('admin.levelUpdated') });
        setEditingId(null);
      }
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.failedToUpdateLevel'), variant: 'destructive' });
    } finally {
      setLevelSavingId(null);
    }
  };

  const handleLevelCancel = () => {
    setEditingId(null);
  };

  // Handle user selection
  const handleUserSelect = (user: UserInfo) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Handle user update
  const handleUserUpdate = async (updatedUser: Partial<UserInfo>) => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_info')
        .update(updatedUser)
        .eq('user_uid', selectedUser.user_uid);

      if (error) {
        toast({ title: t('common.error'), description: t('admin.failedToUpdateUser'), variant: 'destructive' });
      } else {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.user_uid === selectedUser.user_uid ? { ...user, ...updatedUser } : user
        ));
        setSelectedUser({ ...selectedUser, ...updatedUser });
        toast({ title: t('common.success'), description: t('admin.userUpdated') });
        // Clear cache for user_info table
        clearCache('user_info');
      }
    } catch (error) {
      toast({ title: t('common.error'), description: t('admin.failedToUpdateUser'), variant: 'destructive' });
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle refresh
  const handleRefresh = () => {
    clearCache('user_info');
    fetchUsers();
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredUsers.map(u => ({
      'Name': `${u.first_name} ${u.last_name}`,
      'Email': u.email,
      'Phone': u.phone,
      'Status': u.verified ? 'Verified' : 'Unverified',
      'Level': u.level,
      'Balance': u.balance,
      'Referrals': u.referral_count,
      'Registration Date': new Date(u.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('admin.noDataToExport'), variant: 'destructive' });
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(item => Object.values(item).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${new Date().toISOString()}.csv`;
    a.click();
  };
  const handleExportExcel = () => {
    const data = filteredUsers.map(u => ({
      'Name': `${u.first_name} ${u.last_name}`,
      'Email': u.email,
      'Phone': u.phone,
      'Status': u.verified ? 'Verified' : 'Unverified',
      'Level': u.level,
      'Balance': u.balance,
      'Referrals': u.referral_count,
      'Registration Date': new Date(u.created_at).toLocaleDateString(),
    }));
    if (data.length === 0) return toast({ title: t('common.error'), description: t('admin.noDataToExport'), variant: 'destructive' });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    XLSX.writeFile(workbook, `users_${new Date().toISOString()}.xlsx`);
  };
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text(t('admin.userData'), 14, 16);
      const tableColumn = ['Name', 'Email', 'Phone', 'Status', 'Level', 'Balance', 'Referrals', 'Registration Date'];
      const tableRows = filteredUsers.map(u => [
        `${u.first_name} ${u.last_name}`,
        u.email,
        u.phone,
        u.verified ? 'Verified' : 'Unverified',
        u.level,
        u.balance,
        u.referral_count,
        new Date(u.created_at).toLocaleDateString(),
      ]);
      if (tableRows.length === 0) throw new Error(t('admin.noDataToExport'));
      autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20 });
      doc.save(`users_${new Date().toISOString()}.pdf`);
    } catch (err) {
      toast({ title: t('common.error'), description: t('admin.failedToExportPDF') + ': ' + (err.message || err), variant: 'destructive' });
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const verifiedUsers = users.filter(user => user.verified).length;
    const unverifiedUsers = totalUsers - verifiedUsers;
    const totalBalance = users.reduce((sum, user) => sum + (user.balance || 0), 0);
    const totalReferrals = users.reduce((sum, user) => sum + (user.referral_count || 0), 0);

    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      totalBalance,
      totalReferrals
    };
  }, [users]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.users')}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor user accounts, verification status, and activity
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={loadingUsers} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loadingUsers && "animate-spin")} />
            {loadingUsers ? t('common.loading') : t('common.refresh')}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Users</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Verified</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.verifiedUsers}</p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Unverified</p>
                  <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.unverifiedUsers}</p>
                </div>
                <UserX className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Balance</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${stats.totalBalance.toFixed(2)}</p>
                </div>
                <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-950/50 dark:to-indigo-900/50 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Total Referrals</p>
                  <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">{stats.totalReferrals}</p>
                </div>
                <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-2 border-dashed border-muted-foreground/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            {t('admin.filters')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.search')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.searchUsers')}
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.status')}</Label>
              <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.allUsers')}</SelectItem>
                  <SelectItem value="verified">{t('admin.verified')}</SelectItem>
                  <SelectItem value="unverified">{t('admin.unverified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('admin.registrationDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2 focus:border-primary",
                      !userDateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {userDateFilter ? format(userDateFilter, "PPP") : t('admin.selectDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={userDateFilter}
                    onSelect={setUserDateFilter}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-lg">
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-muted/50 to-muted/30">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('admin.users')} ({userCount})
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleExportCSV} className="gap-2">
              <FileText className="h-4 w-4" />
              {t('export.csv')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t('export.excel')}
            </Button>
            <Button size="sm" variant="outline" onClick={handleExportPDF} className="gap-2">
              <FileDown className="h-4 w-4" />
              {t('export.pdf')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin" />
                {t('common.loading')}
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('admin.noUsersFound')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-semibold">{t('admin.name')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.email')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.phone')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.status')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.level')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.balance')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.referrals')}</th>
                      <th className="text-left p-4 font-semibold">{t('admin.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.user_uid} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">
                            {user.first_name} {user.last_name}
                          </div>
                        </td>
                        <td className="p-4 font-mono text-sm">{user.email}</td>
                        <td className="p-4">{user.phone || '-'}</td>
                        <td className="p-4">
                          <Badge 
                            variant={user.verified ? "default" : "secondary"}
                            className={cn(
                              user.verified 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
                                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                            )}
                          >
                            {user.verified ? t('admin.verified') : t('admin.unverified')}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {editingId === user.user_uid ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={user.level?.toString() || '1'}
                                onValueChange={(value) => {
                                  setUsers(prev => prev.map(u => 
                                    u.user_uid === user.user_uid ? { ...u, level: parseInt(value) } : u
                                  ));
                                }}
                              >
                                <SelectTrigger className="w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {levels.map((level) => (
                                    <SelectItem key={level.level} value={level.level.toString()}>
                                      {level.level}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleLevelSave(user.user_uid, user.level)}
                                disabled={levelSavingId === user.user_uid}
                                className="h-8 w-8 p-0"
                              >
                                {levelSavingId === user.user_uid ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleLevelCancel}
                                className="h-8 w-8 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{t('admin.levelPrefix')} {user.level || 1}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleLevelEdit(user.user_uid, user.level || 1)}
                                className="h-8 w-8 p-0 hover:bg-muted"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-mono font-medium">${user.balance || 0}</td>
                        <td className="p-4 font-mono">{user.referral_count || 0}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUserSelect(user)}
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              {t('admin.view')}
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 bg-blue-600 text-white hover:bg-blue-700"
                              onClick={async () => {
                                const now = new Date().toISOString();
                                const { error } = await supabase
                                  .from('user_info')
                                  .update({ withdrawal_limit_start: now })
                                  .eq('user_uid', user.user_uid);
                                if (error) {
                                  toast({ title: t('common.error'), description: 'Failed to reset daily limit', variant: 'destructive' });
                                } else {
                                  setUsers(prev => prev.map(u => u.user_uid === user.user_uid ? { ...u, withdrawal_limit_start: now } : u));
                                  toast({ title: t('common.success'), description: 'Daily withdrawal limit reset for user.' });
                                }
                              }}
                            >
                              <RotateCcw className="h-3 w-3" />
                              Reset Limit
                            </Button>
                            {!user.verified && (
                              <>
                                <Button
                                  size="sm"
                                  className="gap-1 bg-green-600 text-white hover:bg-green-700"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('user_info')
                                      .update({ verified: true })
                                      .eq('user_uid', user.user_uid);
                                    if (error) {
                                      toast({ title: t('common.error'), description: t('admin.failedToVerifyUser'), variant: 'destructive' });
                                    } else {
                                      setUsers(prev => prev.map(u => u.user_uid === user.user_uid ? { ...u, verified: true } : u));
                                      toast({ title: t('common.success'), description: t('admin.userVerified') });
                                    }
                                  }}
                                >
                                  <UserCheck className="h-3 w-3" />
                                  {t('admin.verify')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    const { error } = await supabase
                                      .from('user_info')
                                      .update({ verified: false })
                                      .eq('user_uid', user.user_uid);
                                    if (error) {
                                      toast({ title: t('common.error'), description: t('admin.failedToRejectUser'), variant: 'destructive' });
                                    } else {
                                      setUsers(prev => prev.map(u => u.user_uid === user.user_uid ? { ...u, verified: false } : u));
                                      toast({ title: t('common.success'), description: t('admin.userRejected') });
                                    }
                                  }}
                                >
                                  <UserX className="h-3 w-3" />
                                  {t('admin.reject')}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredUsers.length > itemsPerPage && (
                <div className="flex justify-center py-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={cn(
                            "cursor-pointer hover:bg-muted",
                            currentPage === 1 && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer hover:bg-muted"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={cn(
                            "cursor-pointer hover:bg-muted",
                            currentPage === Math.ceil(filteredUsers.length / itemsPerPage) && "pointer-events-none opacity-50"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('admin.userDetails')}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.name')}</Label>
                  <Input
                    value={`${selectedUser.first_name} ${selectedUser.last_name}`}
                    onChange={(e) => {
                      const [firstName, ...lastNameParts] = e.target.value.split(' ');
                      const lastName = lastNameParts.join(' ');
                      handleUserUpdate({
                        first_name: firstName,
                        last_name: lastName
                      });
                    }}
                    className="border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.email')}</Label>
                  <Input
                    value={selectedUser.email}
                    onChange={(e) => handleUserUpdate({ email: e.target.value })}
                    className="border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.phone')}</Label>
                  <Input
                    value={selectedUser.phone || ''}
                    onChange={(e) => handleUserUpdate({ phone: e.target.value })}
                    className="border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.wallet')}</Label>
                  <Input
                    value={selectedUser.wallet || ''}
                    onChange={(e) => handleUserUpdate({ wallet: e.target.value })}
                    className="border-2 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.balance')}</Label>
                  <Input
                    type="number"
                    value={selectedUser.balance || 0}
                    onChange={(e) => handleUserUpdate({ balance: parseFloat(e.target.value) })}
                    className="border-2 focus:border-primary font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.referralCode')}</Label>
                  <Input
                    value={selectedUser.referral_code || ''}
                    onChange={(e) => handleUserUpdate({ referral_code: e.target.value })}
                    className="border-2 focus:border-primary font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowUserModal(false)}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 