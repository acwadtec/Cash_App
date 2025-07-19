import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Search, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('admin.manageUserWallets')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row gap-4">
            <Input
              placeholder={t('admin.searchByNameOrEmail')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.name')}</TableHead>
                  <TableHead>{t('admin.email')}</TableHead>
                  <TableHead>{t('admin.balance')}</TableHead>
                  <TableHead>{t('admin.totalPoints')}</TableHead>
                  <TableHead>{t('admin.bonuses')}</TableHead>
                  <TableHead>{t('admin.teamEarnings')}</TableHead>
                  <TableHead>{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">{t('common.loading')}</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4">{t('admin.noUsersFound')}</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map(user => (
                    <TableRow key={user.user_uid}>
                      <TableCell>{user.first_name} {user.last_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.balance}</TableCell>
                      <TableCell>{user.total_points}</TableCell>
                      <TableCell>{user.bonuses}</TableCell>
                      <TableCell>{user.team_earnings}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.editUserWallet')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.balance')}</Label>
              <Input
                type="number"
                value={editForm.balance}
                onChange={e => setEditForm(f => ({ ...f, balance: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('admin.totalPoints')}</Label>
              <Input
                type="number"
                value={editForm.total_points}
                onChange={e => setEditForm(f => ({ ...f, total_points: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('admin.bonuses')}</Label>
              <Input
                type="number"
                value={editForm.bonuses}
                onChange={e => setEditForm(f => ({ ...f, bonuses: parseFloat(e.target.value) }))}
              />
            </div>
            <div>
              <Label>{t('admin.teamEarnings')}</Label>
              <Input
                type="number"
                value={editForm.team_earnings}
                onChange={e => setEditForm(f => ({ ...f, team_earnings: parseFloat(e.target.value) }))}
              />
            </div>
            <Button onClick={handleSave} className="w-full">{t('admin.saveChanges')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageWallet; 