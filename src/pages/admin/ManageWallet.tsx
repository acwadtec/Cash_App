import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Search, Pencil, Wallet, DollarSign, Coins, TrendingUp, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

interface UserWallet {
  user_uid: string;
  email: string;
  first_name: string;
  last_name: string;
  balance: number;
  total_points: number;
  bonuses: number;
  team_earnings: number;
}

const ManageWallet: React.FC = () => {
  const { t } = useLanguage();
  const [users, setUsers] = React.useState<UserWallet[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<UserWallet | null>(null);
  const [editForm, setEditForm] = React.useState({
    balance: 0,
    total_points: 0,
    bonuses: 0,
    team_earnings: 0,
  });
  const [showEditModal, setShowEditModal] = React.useState(false);

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_info')
      .select('user_uid, email, first_name, last_name, balance, total_points, bonuses, team_earnings')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: t('common.error'), description: t('admin.error.fetchUsersFailed'), variant: 'destructive' });
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (user: UserWallet) => {
    setSelectedUser(user);
    setEditForm({
      balance: user.balance,
      total_points: user.total_points,
      bonuses: user.bonuses,
      team_earnings: user.team_earnings,
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    const { error } = await supabase
      .from('user_info')
      .update(editForm)
      .eq('user_uid', selectedUser.user_uid);
    if (error) {
      toast({ title: t('common.error'), description: t('admin.error.updateUserWalletFailed'), variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: t('admin.success.userWalletUpdated') });
      setShowEditModal(false);
      fetchUsers();
    }
  };

  // Calculate totals
  const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
  const totalPoints = users.reduce((sum, user) => sum + user.total_points, 0);
  const totalBonuses = users.reduce((sum, user) => sum + user.bonuses, 0);
  const totalTeamEarnings = users.reduce((sum, user) => sum + user.team_earnings, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('admin.manageUserWallets') || 'Manage User Wallets'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor and manage user balances, points, and earnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {users.length} Users
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Balance</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    ${totalBalance.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Coins className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Points</p>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {totalPoints.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Bonuses</p>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    ${totalBonuses.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Team Earnings</p>
                  <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                    ${totalTeamEarnings.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              {t('admin.manageUserWallets') || 'Manage User Wallets'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.searchByNameOrEmail') || 'Search by name or email...'}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Balance</TableHead>
                      <TableHead className="font-semibold">Points</TableHead>
                      <TableHead className="font-semibold">Bonuses</TableHead>
                      <TableHead className="font-semibold">Team Earnings</TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <span>{t('common.loading') || 'Loading...'}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="p-3 rounded-full bg-muted/50 mb-3">
                              <Users className="w-8 h-8 opacity-50" />
                            </div>
                            <span className="text-lg font-medium mb-1">
                              {searchTerm ? 'No users found' : t('admin.noUsersFound') || 'No users found'}
                            </span>
                            <span className="text-sm">
                              {searchTerm ? 'Try adjusting your search terms' : 'No users have been registered yet'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map(user => (
                        <TableRow key={user.user_uid} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="font-medium">
                            {user.first_name} {user.last_name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              ${user.balance.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {user.total_points.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className="font-semibold text-purple-600 dark:text-purple-400">
                              ${user.bonuses.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono">
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              ${user.team_earnings.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleEdit(user)}
                              className="bg-background/50 hover:bg-background/80 border-border/50"
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {t('admin.editUserWallet') || 'Edit User Wallet'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Balance</Label>
              <Input
                type="number"
                value={editForm.balance}
                onChange={e => setEditForm(f => ({ ...f, balance: parseFloat(e.target.value) || 0 }))}
                className="mt-1 bg-background/50 border-border/50"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Total Points</Label>
              <Input
                type="number"
                value={editForm.total_points}
                onChange={e => setEditForm(f => ({ ...f, total_points: parseInt(e.target.value) || 0 }))}
                className="mt-1 bg-background/50 border-border/50"
                min="0"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Bonuses</Label>
              <Input
                type="number"
                value={editForm.bonuses}
                onChange={e => setEditForm(f => ({ ...f, bonuses: parseFloat(e.target.value) || 0 }))}
                className="mt-1 bg-background/50 border-border/50"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Team Earnings</Label>
              <Input
                type="number"
                value={editForm.team_earnings}
                onChange={e => setEditForm(f => ({ ...f, team_earnings: parseFloat(e.target.value) || 0 }))}
                className="mt-1 bg-background/50 border-border/50"
                step="0.01"
                min="0"
              />
            </div>
            <Button 
              onClick={handleSave} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {t('admin.saveChanges') || 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageWallet; 