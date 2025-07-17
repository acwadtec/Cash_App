import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface DepositNumber {
  id: string;
  number: string;
  active: boolean;
  created_at: string;
}

export default function DepositNumbersPage() {
  const { t } = useLanguage();
  const [depositNumbers, setDepositNumbers] = useState<DepositNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<DepositNumber | null>(null);
  const [numberForm, setNumberForm] = useState({
    number: '',
    active: true
  });

  useEffect(() => {
    fetchDepositNumbers();
  }, []);

  const fetchDepositNumbers = async () => {
    try {
      setLoadingNumbers(true);
      const { data, error } = await supabase
        .from('deposit_numbers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDepositNumbers(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch deposit numbers'),
        variant: 'destructive',
      });
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleAddNumber = async () => {
    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .insert([numberForm]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Deposit number added successfully'),
      });
      setShowAddModal(false);
      setNumberForm({
        number: '',
        active: true
      });
      fetchDepositNumbers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to add deposit number'),
        variant: 'destructive',
      });
    }
  };

  const handleEditNumber = async () => {
    if (!selectedNumber) return;

    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .update(numberForm)
        .eq('id', selectedNumber.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Deposit number updated successfully'),
      });
      setShowEditModal(false);
      setSelectedNumber(null);
      setNumberForm({
        number: '',
        active: true
      });
      fetchDepositNumbers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update deposit number'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNumber = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this deposit number?'))) return;

    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Deposit number deleted successfully'),
      });
      fetchDepositNumbers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete deposit number'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Deposit Numbers')}</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Number')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Numbers List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Number')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Created At')}</TableHead>
                <TableHead>{t('Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingNumbers ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('Loading...')}
                  </TableCell>
                </TableRow>
              ) : depositNumbers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {t('No deposit numbers found')}
                  </TableCell>
                </TableRow>
              ) : (
                depositNumbers.map((number) => (
                  <TableRow key={number.id}>
                    <TableCell className="font-mono">{number.number}</TableCell>
                    <TableCell>
                      <Badge variant={number.active ? 'default' : 'secondary'}>
                        {number.active ? t('Active') : t('Inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(number.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedNumber(number);
                            setNumberForm({
                              number: number.number,
                              active: number.active
                            });
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteNumber(number.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Number Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedNumber(null);
          setNumberForm({
            number: '',
            active: true
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {showAddModal ? t('Add New Number') : t('Edit Number')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Number')}</Label>
              <Input
                value={numberForm.number}
                onChange={(e) => setNumberForm(prev => ({ ...prev, number: e.target.value }))}
                placeholder={t('Enter deposit number')}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={numberForm.active}
                onChange={(e) => setNumberForm(prev => ({ ...prev, active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="active">{t('Active')}</Label>
            </div>
            <Button
              onClick={showAddModal ? handleAddNumber : handleEditNumber}
              disabled={!numberForm.number}
            >
              {showAddModal ? t('Add Number') : t('Update Number')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 