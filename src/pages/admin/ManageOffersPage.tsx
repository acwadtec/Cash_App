import { useState, useEffect } from 'react';
import { Package, Download, Search, Plus } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Components
import OffersTable from '@/components/OffersTable';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  cost: number;
  daily_profit: number;
  monthly_profit: number;
  image_url?: string;
  type?: string;
  deadline?: string;
  active?: boolean;
}

export default function ManageOffersPage() {
  const { t } = useLanguage();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [offerForm, setOfferForm] = useState<Omit<Offer, 'id'>>({
    title: '',
    description: '',
    amount: 0,
    cost: 0,
    daily_profit: 0,
    monthly_profit: 0,
    type: 'regular',
    active: true,
    image_url: '',
    deadline: undefined
  });

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoadingOffers(true);
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to fetch offers'),
        variant: 'destructive',
      });
    } finally {
      setLoadingOffers(false);
    }
  };

  const handleAddOffer = async () => {
    try {
      const { error } = await supabase
        .from('offers')
        .insert([offerForm]);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Offer added successfully'),
      });
      setShowAddModal(false);
      setOfferForm({
        title: '',
        description: '',
        amount: 0,
        cost: 0,
        daily_profit: 0,
        monthly_profit: 0,
        type: 'regular',
        active: true,
        image_url: '',
        deadline: undefined
      });
      fetchOffers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to add offer'),
        variant: 'destructive',
      });
    }
  };

  const handleEditOffer = async () => {
    if (!selectedOffer) return;

    try {
      const { error } = await supabase
        .from('offers')
        .update(offerForm)
        .eq('id', selectedOffer.id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Offer updated successfully'),
      });
      setShowEditModal(false);
      setSelectedOffer(null);
      fetchOffers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to update offer'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm(t('Are you sure you want to delete this offer?'))) return;

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: t('Success'),
        description: t('Offer deleted successfully'),
      });
      fetchOffers();
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to delete offer'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4 p-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">{t('Manage Offers')}</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Offer')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Offers List')}</CardTitle>
        </CardHeader>
        <CardContent>
          <OffersTable 
            offers={offers}
            onEdit={(offer) => {
              setSelectedOffer(offer);
              setOfferForm({
                title: offer.title,
                description: offer.description,
                amount: offer.amount,
                cost: offer.cost,
                daily_profit: offer.daily_profit,
                monthly_profit: offer.monthly_profit,
                type: offer.type,
                active: offer.active,
                image_url: offer.image_url,
                deadline: offer.deadline
              });
              setShowEditModal(true);
            }}
            onDelete={handleDeleteOffer}
          />
        </CardContent>
      </Card>

      {/* Add Offer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add New Offer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Title')}</Label>
              <Input
                value={offerForm.title}
                onChange={(e) => setOfferForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Input
                value={offerForm.description}
                onChange={(e) => setOfferForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Amount')}</Label>
              <Input
                type="number"
                value={offerForm.amount}
                onChange={(e) => setOfferForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Cost')}</Label>
              <Input
                type="number"
                value={offerForm.cost}
                onChange={(e) => setOfferForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Daily Profit')}</Label>
              <Input
                type="number"
                value={offerForm.daily_profit}
                onChange={(e) => setOfferForm(prev => ({ ...prev, daily_profit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Monthly Profit')}</Label>
              <Input
                type="number"
                value={offerForm.monthly_profit}
                onChange={(e) => setOfferForm(prev => ({ ...prev, monthly_profit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Image URL')}</Label>
              <Input
                value={offerForm.image_url}
                onChange={(e) => setOfferForm(prev => ({ ...prev, image_url: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Deadline')}</Label>
              <Input
                type="date"
                value={offerForm.deadline}
                onChange={(e) => setOfferForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <Button onClick={handleAddOffer}>{t('Add Offer')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Edit Offer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('Title')}</Label>
              <Input
                value={offerForm.title}
                onChange={(e) => setOfferForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Description')}</Label>
              <Input
                value={offerForm.description}
                onChange={(e) => setOfferForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Amount')}</Label>
              <Input
                type="number"
                value={offerForm.amount}
                onChange={(e) => setOfferForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Cost')}</Label>
              <Input
                type="number"
                value={offerForm.cost}
                onChange={(e) => setOfferForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Daily Profit')}</Label>
              <Input
                type="number"
                value={offerForm.daily_profit}
                onChange={(e) => setOfferForm(prev => ({ ...prev, daily_profit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Monthly Profit')}</Label>
              <Input
                type="number"
                value={offerForm.monthly_profit}
                onChange={(e) => setOfferForm(prev => ({ ...prev, monthly_profit: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>{t('Image URL')}</Label>
              <Input
                value={offerForm.image_url}
                onChange={(e) => setOfferForm(prev => ({ ...prev, image_url: e.target.value }))}
              />
            </div>
            <div>
              <Label>{t('Deadline')}</Label>
              <Input
                type="date"
                value={offerForm.deadline}
                onChange={(e) => setOfferForm(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>
            <Button onClick={handleEditOffer}>{t('Update Offer')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 