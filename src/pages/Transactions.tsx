
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Transactions() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      // Fetch deposit requests
      const { data: deposits, error: depositError } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_uid', user.id)
        .order('created_at', { ascending: false });
      // TODO: Fetch withdrawals and other types if needed
      let txns = [];
      if (deposits) {
        txns = deposits.map((item) => ({
          id: `DEP${item.id}`,
          type: 'deposit',
          amount: item.amount,
          status: item.status === 'approved' ? 'completed' : item.status, // show 'completed' if approved
          date: new Date(item.created_at).toLocaleDateString(),
          description: t('transactions.desc.capitalDeposit'),
          method: t('transactions.method.bankTransfer'),
          rejectionReason: item.status === 'rejected' ? t('transactions.invalidBankDetails') : null,
          adminNote: item.status === 'approved' ? t('transactions.paymentProcessed') : null,
        }));
      }
      setTransactions(txns);
      setLoading(false);
    };
    fetchTransactions();
  }, [t]);

  // Check if user has user_info data
  useEffect(() => {
    const checkUserInfo = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        // Check if user is admin
        const isAdmin = await checkIfUserIsAdmin(user.id);
        
        // Only check user_info for non-admin users
        if (!isAdmin) {
          const { data: userInfo } = await supabase
            .from('user_info')
            .select('user_uid')
            .eq('user_uid', user.id)
            .single();
          
          if (!userInfo) {
            // Show alert before redirecting
            setShowAlert(true);
            setTimeout(() => {
              navigate('/update-account');
            }, 3000); // Redirect after 3 seconds
            return;
          }
        }
      }
    };
    checkUserInfo();
  }, [navigate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesFilter = filter === 'all' || transaction.type === filter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Export handlers
  const handleExportExcel = () => {
    const data = filteredTransactions.map(txn => ({
      'ID': txn.id,
      'Type': txn.type,
      'Amount': txn.amount,
      'Status': txn.status,
      'Date': txn.date,
      'Description': txn.description,
      'Method': txn.method,
      'Rejection Reason': txn.rejectionReason || '',
      'Admin Note': txn.adminNote || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    XLSX.writeFile(workbook, `transactions_${new Date().toISOString()}.xlsx`);
  };
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text('Transaction History', 14, 16);
    const tableColumn = ['ID', 'Type', 'Amount', 'Status', 'Date', 'Description', 'Method', 'Rejection Reason', 'Admin Note'];
    const tableRows = filteredTransactions.map(txn => [
      txn.id,
      txn.type,
      txn.amount,
      txn.status,
      txn.date,
      txn.description,
      txn.method,
      txn.rejectionReason || '',
      txn.adminNote || '',
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save(`transactions_${new Date().toISOString()}.pdf`);
  };

  return (
    <div className="min-h-screen py-20">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile') || 'Please complete your account information to view transactions. Redirecting to profile setup...'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold mb-4">{t('transactions.title')}</h1>
            <p className="text-base md:text-xl text-muted-foreground px-4">
              {t('transactions.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4 px-4">
              <Button size="sm" variant="outline" onClick={handleExportExcel}>Export Excel</Button>
              <Button size="sm" variant="outline" onClick={handleExportPDF}>Export PDF</Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4 md:mb-6 shadow-card">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex flex-col gap-3 md:gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('transactions.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 md:h-12"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full md:w-48 h-10 md:h-12">
                    <SelectValue placeholder={t('transactions.all')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('transactions.all')}</SelectItem>
                    <SelectItem value="withdrawal">{t('transactions.withdrawal')}</SelectItem>
                    <SelectItem value="deposit">{t('transactions.deposit')}</SelectItem>
                    <SelectItem value="bonus">{t('transactions.bonus')}</SelectItem>
                    <SelectItem value="earning">{t('transactions.earning')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions List */}
          {loading ? (
            <div className="text-center py-12">{t('common.loading')}</div>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card key={transaction.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">{t(`transactions.${transaction.type}`)}</Badge>
                        <Badge className={getStatusColor(transaction.status)}>
                          {t(`transactions.${transaction.status}`)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-lg mb-1">{transaction.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('transactions.id')} {transaction.id} • {transaction.method}
                      </p>
                      {transaction.status === 'rejected' && transaction.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          <strong>{t('withdrawal.rejectionReason')}:</strong> {transaction.rejectionReason}
                        </p>
                      )}
                      {transaction.status === 'completed' && transaction.adminNote && (
                        <p className="text-sm text-green-600 mt-1">
                          <strong>{t('withdrawal.adminNote')}:</strong> {transaction.adminNote}
                        </p>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${
                        transaction.type === 'withdrawal' || transaction.type === 'expense' 
                          ? 'text-destructive' 
                          : 'text-success'
                      }`}>
                        {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount.toLocaleString()} {t('deposit.amountUnit')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.date}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          {filteredTransactions.length === 0 && !loading && (
            <Card className="shadow-card">
              <CardContent className="pt-8 text-center">
                <p className="text-muted-foreground text-lg">{t('transactions.noResults')}</p>
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="mt-8 gradient-card shadow-glow">
            <CardHeader>
              <CardTitle className="text-center">{t('transactions.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-success mb-2">
                    ${transactions.filter(t => t.type !== 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} {t('deposit.amountUnit')}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.totalIncome')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-destructive mb-2">
                    ${transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} {t('deposit.amountUnit')}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.totalWithdrawals')}</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">
                    {transactions.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">{t('transactions.pendingCount')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
