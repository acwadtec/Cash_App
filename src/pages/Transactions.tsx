
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

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

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
          description: t('transactions.desc.balanceDeposit'),
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
    doc.text(t('transactions.transactionHistory'), 14, 16);
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
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-warning bg-gradient-to-r from-warning/10 to-warning/5 backdrop-blur-sm shadow-2xl">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <AlertDescription className="text-warning-foreground font-medium">
              {t('common.completeProfile')}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('transactions.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground px-4 max-w-3xl mx-auto leading-relaxed">
              {t('transactions.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8 px-4">
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleExportExcel}
                className="bg-gradient-to-r from-green-500 to-green-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl px-6 py-3 font-bold"
              >
                📊 {t('transactions.exportExcel')}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleExportPDF}
                className="bg-gradient-to-r from-red-500 to-red-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl px-6 py-3 font-bold"
              >
                📄 {t('transactions.exportPDF')}
              </Button>
            </div>
          </div>

          {/* Enhanced Filters */}
          <Card className="mb-8 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardContent className="pt-6 pb-6 relative">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder={t('transactions.search')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300"
                  />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full md:w-48 h-12 bg-gradient-to-r from-primary/5 to-transparent border-primary/20 focus:border-primary/50 transition-all duration-300">
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

          {/* Enhanced Transactions List */}
          {loading ? (
            <div className="text-center py-20">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 mx-auto"></div>
                <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-primary mx-auto"></div>
              </div>
              <p className="mt-6 text-lg text-muted-foreground font-medium">{t('common.loading')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTransactions.map((transaction) => (
                <Card key={transaction.id} className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden group hover:scale-105 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardContent className="pt-6 pb-6 relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 font-medium">
                            {t(`transactions.${transaction.type}`)}
                          </Badge>
                          <Badge className={`${getStatusColor(transaction.status)} shadow-lg font-medium`}>
                            {t(`transactions.${transaction.status}`)}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-xl mb-2 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                          {transaction.description}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          <span className="font-mono">{t('transactions.id')} {transaction.id}</span> • {transaction.method}
                        </p>
                        {transaction.status === 'rejected' && transaction.rejectionReason && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-red-500/5 to-transparent border border-red-500/10">
                            <p className="text-sm text-red-600 font-medium">
                              <strong>{t('withdrawal.rejectionReason')}:</strong> {transaction.rejectionReason}
                            </p>
                          </div>
                        )}
                        {transaction.status === 'completed' && transaction.adminNote && (
                          <div className="p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-transparent border border-green-500/10">
                            <p className="text-sm text-green-600 font-medium">
                              <strong>{t('withdrawal.adminNote')}:</strong> {transaction.adminNote}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-3xl font-bold mb-2 ${
                          transaction.type === 'withdrawal' || transaction.type === 'expense' 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {transaction.type === 'withdrawal' ? '-' : '+'}${transaction.amount.toLocaleString()} {t('deposit.amountUnit')}
                        </div>
                        <div className="text-sm text-muted-foreground font-medium">
                          {transaction.date}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {filteredTransactions.length === 0 && !loading && (
            <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
              <CardContent className="pt-16 pb-16 relative text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary/10 to-purple-500/10 flex items-center justify-center">
                  <div className="text-3xl">📋</div>
                </div>
                <p className="text-xl text-muted-foreground font-medium mb-2">
                  {t('transactions.noResults')}
                </p>
                <p className="text-sm text-muted-foreground">
                  No transactions match your current filters
                </p>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Summary Card */}
          <Card className="mt-12 shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardHeader className="relative">
              <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t('transactions.summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-500 to-green-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <div className="text-2xl">💰</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${transactions.filter(t => t.type !== 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} {t('deposit.amountUnit')}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('transactions.totalIncome')}</div>
                </div>
                <div className="group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <div className="text-2xl">💸</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    ${transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toLocaleString()} {t('deposit.amountUnit')}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('transactions.totalWithdrawals')}</div>
                </div>
                <div className="group">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 p-1 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <div className="text-2xl">⏳</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {transactions.filter(t => t.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground font-medium">{t('transactions.pendingCount')}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
