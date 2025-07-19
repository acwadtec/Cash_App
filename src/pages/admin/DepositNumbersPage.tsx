import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash, Phone } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

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
  const { t, isRTL } = useLanguage();
  const [depositNumbers, setDepositNumbers] = useState<DepositNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [newNumber, setNewNumber] = useState('');

  useEffect(() => { 
    fetchDepositNumbers(); 
  }, []);

  const fetchDepositNumbers = async () => {
    setLoadingNumbers(true);
    try {
      const { data, error } = await supabase
        .from('deposit_numbers')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching deposit numbers:', error);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.fetchFailed'), 
          variant: 'destructive' 
        });
      } else {
        setDepositNumbers(data || []);
      }
    } catch (error) {
      console.error('Error fetching deposit numbers:', error);
              toast({ 
          title: t('common.error'), 
          description: t('deposit.error.fetchFailed'), 
          variant: 'destructive' 
        });
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleAddNumber = async () => {
    if (!newNumber.trim()) {
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.validNumber'), 
        variant: 'destructive' 
      });
      return;
    }

    if (depositNumbers.length >= 10) {
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.maxNumbers'), 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .insert([{ number: newNumber.trim() }]);
      
      if (error) {
        console.error('Error adding deposit number:', error);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.addFailed'), 
          variant: 'destructive' 
        });
      } else {
        setNewNumber('');
        await fetchDepositNumbers();
        toast({ 
          title: t('common.success'), 
          description: t('deposit.success.added') 
        });
      }
    } catch (error) {
      console.error('Error adding deposit number:', error);
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.addFailed'), 
        variant: 'destructive' 
      });
    }
  };

  const handleRemoveNumber = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error removing deposit number:', error);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.removeFailed'), 
          variant: 'destructive' 
        });
      } else {
        await fetchDepositNumbers();
        toast({ 
          title: t('common.success'), 
          description: t('deposit.success.removed') 
        });
      }
    } catch (error) {
      console.error('Error removing deposit number:', error);
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.removeFailed'), 
        variant: 'destructive' 
      });
    }
  };

  const handleUpdateNumber = async (id: string, value: string) => {
    if (!value.trim()) {
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.validNumber'), 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('deposit_numbers')
        .update({ number: value.trim() })
        .eq('id', id);
      
      if (error) {
        console.error('Error updating deposit number:', error);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.updateFailed'), 
          variant: 'destructive' 
        });
      } else {
        await fetchDepositNumbers();
        toast({ 
          title: t('common.success'), 
          description: t('deposit.success.updated') 
        });
      }
    } catch (error) {
      console.error('Error updating deposit number:', error);
      toast({ 
        title: t('common.error'), 
        description: t('deposit.error.updateFailed'), 
        variant: 'destructive' 
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddNumber();
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-8">
      <Card className="shadow-card w-full bg-background border border-border dark:bg-muted/40 dark:border-muted-foreground/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {t('deposit.numbers') || 'Deposit Numbers'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <Input
              value={newNumber}
              onChange={e => setNewNumber(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('deposit.userNumber') || 'Mobile Number'}
              className="max-w-xs truncate overflow-x-auto bg-background border border-border focus:ring-2 focus:ring-primary/30 dark:bg-muted/60 dark:border-muted-foreground/20"
              disabled={depositNumbers.length >= 10}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleAddNumber} 
                    disabled={depositNumbers.length >= 10 || !newNumber.trim()}
                    className="flex gap-1 items-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('common.save') || 'Add'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('common.save') || 'Add'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {depositNumbers.length >= 10 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md dark:bg-yellow-900/30 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {t('deposit.error.maxNumbers') || 'Maximum of 10 deposit numbers reached'}
              </p>
            </div>
          )}

          <Separator className="my-4" />

          {loadingNumbers ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">{t('common.loading') || 'Loading...'}</div>
          ) : (
            <div className="space-y-2">
              {depositNumbers.map((num) => (
                <div
                  key={num.id}
                  className="flex items-center gap-2 p-3 border border-border bg-card dark:bg-muted/60 dark:border-muted-foreground/10 rounded-xl shadow-sm transition hover:shadow-md"
                >
                  <Input
                    value={num.number}
                    onChange={e => handleUpdateNumber(num.id, e.target.value)}
                    className="max-w-xs truncate overflow-x-auto bg-background border border-border focus:ring-2 focus:ring-primary/30 dark:bg-muted/60 dark:border-muted-foreground/20"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNumber(num.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive focus:ring-2 focus:ring-destructive/30"
                          aria-label={t('common.delete') || 'Remove'}
                        >
                          <Trash className="w-5 h-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('common.delete') || 'Remove'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
              {depositNumbers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <Phone className="w-10 h-10 opacity-30" />
                  <span className="text-lg font-medium">{t('deposit.noNumbers') || 'No deposit numbers found'}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 