import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash, Phone, Save, X } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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

  const handleStartEdit = (number: DepositNumber) => {
    setEditingId(number.id);
    setEditValue(number.number);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleUpdateNumber = async () => {
    if (!editValue.trim()) {
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
        .update({ number: editValue.trim() })
        .eq('id', editingId);
      
      if (error) {
        console.error('Error updating deposit number:', error);
        toast({ 
          title: t('common.error'), 
          description: t('deposit.error.updateFailed'), 
          variant: 'destructive' 
        });
      } else {
        setEditingId(null);
        setEditValue('');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t('deposit.numbers') || 'Deposit Numbers'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage deposit numbers for user transactions
            </p>
          </div>
          <Badge variant="outline" className="px-3 py-1">
            {depositNumbers.length}/10 Numbers
          </Badge>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 rounded-lg bg-primary/10">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              {t('deposit.manageNumbers') || 'Manage Deposit Numbers'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Number */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="newNumber" className="text-sm font-medium mb-2 block">
                    {t('deposit.userNumber') || 'Mobile Number'}
                  </Label>
                  <Input
                    id="newNumber"
                    value={newNumber}
                    onChange={e => setNewNumber(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter mobile number..."
                    className="h-11 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                    disabled={depositNumbers.length >= 10}
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handleAddNumber} 
                        disabled={depositNumbers.length >= 10 || !newNumber.trim()}
                        className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('common.save') || 'Add'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('common.save') || 'Add'}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {depositNumbers.length >= 10 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl dark:bg-yellow-900/20 dark:border-yellow-800/50">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    ⚠️ {t('deposit.error.maxNumbers') || 'Maximum of 10 deposit numbers reached'}
                  </p>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Numbers List */}
            {loadingNumbers ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <span className="text-lg font-medium">{t('common.loading') || 'Loading...'}</span>
              </div>
            ) : (
              <div className="space-y-3">
                {depositNumbers.map((num) => (
                  <div
                    key={num.id}
                    className="group flex items-center gap-4 p-4 border border-border/50 bg-background/30 hover:bg-background/50 rounded-xl transition-all duration-200 hover:shadow-md"
                  >
                    {editingId === num.id ? (
                      <>
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 bg-background/50 border-border/50 focus:ring-2 focus:ring-primary/30"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleUpdateNumber}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{num.number}</div>
                          <div className="text-xs text-muted-foreground">
                            Added {new Date(num.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(num)}
                                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveNumber(num.id)}
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {depositNumbers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <Phone className="w-12 h-12 opacity-50" />
                    </div>
                    <span className="text-lg font-medium mb-2">{t('deposit.noNumbers') || 'No deposit numbers found'}</span>
                    <span className="text-sm text-center max-w-md">
                      Add your first deposit number to start accepting user deposits
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 