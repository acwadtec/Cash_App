import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table } from '@/components/ui/table';
import { Dialog } from '@/components/ui/dialog';
import OffersTable from '@/components/OffersTable';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  active?: boolean;
  deadline?: string;
}

export default function ManageOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);
  const [form, setForm] = useState({ title: '', description: '', amount: '', deadline: '' });
  const navigate = useNavigate();

  // Fetch offers from Supabase
  const fetchOffers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('offers').select('*');
    if (error) {
      console.error('Error fetching offers:', error);
      setOffers([]);
    } else {
      setOffers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Open dialog for create or edit
  const openDialog = (offer?: Offer) => {
    if (offer) {
      setEditOffer(offer);
      setForm({ title: offer.title, description: offer.description, amount: offer.amount.toString(), deadline: offer.deadline || '' });
    } else {
      setEditOffer(null);
      setForm({ title: '', description: '', amount: '', deadline: '' });
    }
    setShowDialog(true);
  };

  // Create or update offer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, amount: Number(form.amount), deadline: form.deadline || null };
    if (editOffer) {
      // Update
      const { error } = await supabase.from('offers').update(payload).eq('id', editOffer.id);
      if (error) console.error('Error updating offer:', error);
    } else {
      // Create
      const { error } = await supabase.from('offers').insert([payload]);
      if (error) console.error('Error creating offer:', error);
    }
    setShowDialog(false);
    fetchOffers();
  };

  // Delete offer
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('offers').delete().eq('id', id);
    if (error) console.error('Error deleting offer:', error);
    fetchOffers();
  };

  // Delete all offers
  const handleDeleteAll = async () => {
    for (const offer of offers) {
      const { error } = await supabase.from('offers').delete().eq('id', offer.id);
      if (error) console.error('Error deleting offer:', error);
    }
    fetchOffers();
  };

  const sortedOffers = [...offers].sort((a, b) => {
    if (!!a.active === !!b.active) return 0;
    return a.active ? -1 : 1;
  });

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Offers</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/admin')} variant="success">Save</Button>
            <Button onClick={() => openDialog()}>Create Offer</Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={offers.length === 0}>
              Delete All
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Offers List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Loading...</div>
            ) : (
              <OffersTable
                offers={sortedOffers}
                onEdit={openDialog}
                onDelete={handleDelete}
                showActions
                renderExtra={(offer) => (
                  <Switch
                    checked={!!offer.active}
                    onCheckedChange={async (checked) => {
                      setOffers((prev) => prev.map((o) => o.id === offer.id ? { ...o, active: checked } : o));
                      const { error } = await supabase.from('offers').update({ active: checked }).eq('id', offer.id);
                      if (error) console.error('Error updating active status:', error);
                    }}
                    className="ml-2"
                  />
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Dialog for create/edit */}
        {showDialog && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
              <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-black">
                <h2 className="text-xl font-bold mb-4">{editOffer ? 'Edit Offer' : 'Create Offer'}</h2>
                <div className="mb-4">
                  <Label htmlFor="title" className="text-black">Title</Label>
                  <Input id="title" name="title" value={form.title} onChange={handleChange} required className="text-white bg-black" />
                </div>
                <div className="mb-4">
                  <Label htmlFor="description" className="text-black">Description</Label>
                  <Input id="description" name="description" value={form.description} onChange={handleChange} required className="text-white bg-black" />
                </div>
                <div className="mb-6">
                  <Label htmlFor="amount" className="text-black">Amount</Label>
                  <Input id="amount" name="amount" type="number" value={form.amount} onChange={handleChange} required className="text-white bg-black" />
                </div>
                <div className="mb-6">
                  <Label htmlFor="deadline" className="text-black">Deadline</Label>
                  <Input id="deadline" name="deadline" type="date" value={form.deadline} onChange={handleChange} required className="text-white bg-black" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" className="text-white bg-black" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button type="submit">{editOffer ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </div>
          </Dialog>
        )}
      </div>
    </div>
  );
} 