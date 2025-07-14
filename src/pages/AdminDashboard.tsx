import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { Users, FileCheck, Gift, DollarSign, Bell, Download, Users2, Trophy, TrendingUp, BarChart3, Search, CalendarIcon, X, MessageCircle, Award, AlertTriangle } from 'lucide-react';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Custom Components
import OffersTable from '@/components/OffersTable';
import { AdminChat } from '@/components/AdminChat';

// Hooks and Contexts
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';

// Services
import { supabase } from '@/lib/supabase';
import { checkIfUserIsAdmin } from '@/lib/supabase';

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'info',
    target: 'all',
    targetValue: '',
    banner: false,
    scheduledAt: '',
    imageFile: null,
    imageUrl: '',
    id: null,
  });
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [pendingVerifications, setPendingVerifications] = useState(0);
  const [activeOffers, setActiveOffers] = useState(0);
  const [depositNumbers, setDepositNumbers] = useState([]);
  const [newNumber, setNewNumber] = useState('');
  const [depositRequests, setDepositRequests] = useState([]);
  const [loadingDepositNumbers, setLoadingDepositNumbers] = useState(false);
  const [loadingDepositRequests, setLoadingDepositRequests] = useState(false);
  
  // New state for enhanced features
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [userDateFilter, setUserDateFilter] = useState<Date | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Advanced stats state
  const [monthlyDeposits, setMonthlyDeposits] = useState(0);
  const [weeklyNewUsers, setWeeklyNewUsers] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [averageTransactionValue, setAverageTransactionValue] = useState(0);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    newUsersOverTime: [],
    transactionTypes: [],
    activityByHour: []
  });
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [offerUserCounts, setOfferUserCounts] = useState({});
  const [offerProfits, setOfferProfits] = useState({});

  // Add referral system state
  const [referralSettings, setReferralSettings] = useState({
    level1Points: 100,
    level2Points: 50,
    level3Points: 25
  });
  const [topReferrers, setTopReferrers] = useState([]);
  const [loadingReferrers, setLoadingReferrers] = useState(false);

  // Gamification state
  const [badges, setBadges] = useState([]);
  const [levels, setLevels] = useState([]);
  const [gamificationSettings, setGamificationSettings] = useState<{
    points_multiplier?: { deposit?: number; referral?: number; withdrawal?: number };
    badge_auto_award?: boolean;
    level_auto_update?: boolean;
  }>({});
  const [userBadges, setUserBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [loadingGamification, setLoadingGamification] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [badgeForm, setBadgeForm] = useState({
    name: '',
    description: '',
    type: 'achievement',
    requirement: 1,
    points_awarded: 0,
    is_active: true
  });

  // Enhanced gamification state for better edit/delete functionality
  const [editingBadgeId, setEditingBadgeId] = useState(null);
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState({ type: '', id: null, name: '' });
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelForm, setLevelForm] = useState({
    level: 1,
    name: '',
    description: '',
    requirement: 100,
    benefits: ''
  });
  const [showUserBadgeModal, setShowUserBadgeModal] = useState(false);
  const [selectedUserBadge, setSelectedUserBadge] = useState(null);
  const [userBadgeForm, setUserBadgeForm] = useState({
    user_id: '',
    badge_id: '',
    points_earned: 0
  });

  // Mock data
  const stats = {
    totalUsers: 1247,
    pendingVerifications: 23,
    activeOffers: 8,
    pendingWithdrawals: 15,
  };

  const mockWithdrawals = [
    { id: 1, user: 'أحمد محمد', amount: 250, type: 'personal', method: 'bank', date: '2024-07-01' },
    { id: 2, user: 'فاطمة أحمد', amount: 150, type: 'bonus', method: 'wallet', date: '2024-07-02' },
    { id: 3, user: 'محمد علي', amount: 300, type: 'team', method: 'crypto', date: '2024-07-03' },
  ];

  // Withdrawal management state
  const [withdrawals, setWithdrawals] = useState([]);
  const [groupedWithdrawals, setGroupedWithdrawals] = useState<Record<string, any[]>>({});
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [proofImage, setProofImage] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [packageLimits, setPackageLimits] = useState({});
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  // Time Slot Editor State
  const [newTimeSlotDay, setNewTimeSlotDay] = useState('');
  const [newTimeSlotStart, setNewTimeSlotStart] = useState('');
  const [newTimeSlotEnd, setNewTimeSlotEnd] = useState('');
  const handleAddTimeSlot = () => {
    if (newTimeSlotDay && newTimeSlotStart && newTimeSlotEnd && Number(newTimeSlotEnd) > Number(newTimeSlotStart)) {
      setTimeSlots([...timeSlots, `${newTimeSlotDay}:${newTimeSlotStart}:${newTimeSlotEnd}`]);
      setNewTimeSlotDay(''); setNewTimeSlotStart(''); setNewTimeSlotEnd('');
    }
  };
  const handleRemoveTimeSlot = (idx) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };

  // Package Limit Editor State
  const [packageFormName, setPackageFormName] = useState('');
  const [packageFormMin, setPackageFormMin] = useState('');
  const [packageFormMax, setPackageFormMax] = useState('');
  const [packageFormDaily, setPackageFormDaily] = useState('');
  const [packageEditIndex, setPackageEditIndex] = useState(null);
  const handleAddOrUpdatePackageLimit = (e) => {
    e.preventDefault();
    if (!packageFormName || !packageFormMin || !packageFormMax || !packageFormDaily) return;
    setPackageLimits(prev => ({
      ...prev,
      [packageFormName]: {
        min: Number(packageFormMin),
        max: Number(packageFormMax),
        daily: Number(packageFormDaily)
      }
    }));
    setPackageFormName(''); setPackageFormMin(''); setPackageFormMax(''); setPackageFormDaily(''); setPackageEditIndex(null);
  };
  const handleEditPackageLimit = (pkg, vals, idx) => {
    setPackageFormName(pkg);
    setPackageFormMin(vals.min);
    setPackageFormMax(vals.max);
    setPackageFormDaily(vals.daily);
    setPackageEditIndex(idx);
  };
  const handleCancelEditPackageLimit = (e) => {
    e.preventDefault();
    setPackageFormName(''); setPackageFormMin(''); setPackageFormMax(''); setPackageFormDaily(''); setPackageEditIndex(null);
  };
  const handleRemovePackageLimit = (pkg) => {
    const newLimits = { ...packageLimits };
    delete newLimits[pkg];
    setPackageLimits(newLimits);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setNotificationData(prev => ({ ...prev, imageFile: file, imageUrl: URL.createObjectURL(file) }));
    }
  };

  const uploadImage = async (file) => {
    if (!file) return null;
    const filePath = `notifications/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage.from('notification-images').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('notification-images').getPublicUrl(filePath);
    return urlData.publicUrl;
  };

  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast({ title: t('common.error'), description: t('common.error'), variant: 'destructive' });
      return;
    }
    let imageUrl = notificationData.imageUrl;
    if (notificationData.imageFile && !imageUrl.startsWith('http')) {
      imageUrl = await uploadImage(notificationData.imageFile);
    }
    const notif = {
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      user_uid: notificationData.target === 'user' ? notificationData.targetValue : null,
      banner: notificationData.banner,
      scheduled_at: notificationData.scheduledAt ? new Date(notificationData.scheduledAt).toISOString() : null,
      sent_at: notificationData.scheduledAt ? null : new Date().toISOString(),
      read: false,
      image_url: imageUrl || null,
    };
    if (editingId) {
      await supabase.from('notifications').update(notif).eq('id', editingId);
    } else {
      await supabase.from('notifications').insert([notif]);
    }
    setNotificationData({ title: '', message: '', type: 'info', target: 'all', targetValue: '', banner: false, scheduledAt: '', imageFile: null, imageUrl: '', id: null });
    setEditingId(null);
    fetchNotifications(setNotifications, setLoadingNotifications, toast, t);
  };

  const handleEdit = (notif) => {
    setNotificationData({
      title: notif.title,
      message: notif.message,
      type: notif.type,
      target: notif.user_uid ? 'user' : 'all',
      targetValue: notif.user_uid || '',
      banner: notif.banner,
      scheduledAt: notif.scheduled_at ? notif.scheduled_at.slice(0, 16) : '',
      imageFile: null,
      imageUrl: notif.image_url || '',
      id: notif.id,
    });
    setEditingId(notif.id);
  };

  const handleDelete = async (notif) => {
    if (notif.image_url) {
      // Remove image from storage
      const path = notif.image_url.split('/notification-images/')[1];
      if (path) {
        await supabase.storage.from('notification-images').remove([path]);
      }
    }
    await supabase.from('notifications').delete().eq('id', notif.id);
    fetchNotifications(setNotifications, setLoadingNotifications, toast, t);
  };

  const handleExport = (type: string, format?: string) => {
    setExportType(type);
    if (format) {
      setExportFormat(format);
      performExport(type, format);
    } else {
      setShowExportModal(true);
    }
  };

  const performExport = async (type: string, format: string) => {
    setExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Here you would implement actual export logic based on type and format
      let data = [];
      let fileName = '';
      
      if (type === t('admin.users')) {
        // Fetch comprehensive user data including all metrics
        const { data: userData, error } = await supabase
          .from('user_info')
          .select(`
            *,
            user_earnings!inner(
              total_earnings,
              personal_earnings,
              team_earnings,
              bonuses
            ),
            user_activity!inner(
              total_deposits,
              total_withdrawals,
              last_login
            )
          `)
          .neq('role', 'admin');
        
        if (error) {
          console.error('Error fetching user data:', error);
          data = users; // Fallback to basic user data
        } else {
          // Merge the data to create comprehensive user records
          data = userData?.map(user => ({
            ...user,
            total_earnings: user.user_earnings?.total_earnings || 0,
            personal_earnings: user.user_earnings?.personal_earnings || 0,
            team_earnings: user.user_earnings?.team_earnings || 0,
            bonuses: user.user_earnings?.bonuses || 0,
            total_deposits: user.user_activity?.total_deposits || 0,
            total_withdrawals: user.user_activity?.total_withdrawals || 0,
            last_login: user.user_activity?.last_login || null
          })) || users;
        }
        fileName = `users_${new Date().toISOString().split('T')[0]}`;
      } else if (type === t('admin.transactions')) {
        // Fetch comprehensive transaction data
        const { data: transactionData, error } = await supabase
          .from('transactions')
          .select(`
            *,
            user_info!inner(
              first_name,
              last_name,
              email
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching transaction data:', error);
          // Fallback to mock data
          data = [
            { id: 1, user: 'أحمد محمد', type: 'withdrawal', amount: 250, date: '2024-07-01', status: 'completed' },
            { id: 2, user: 'فاطمة أحمد', type: 'deposit', amount: 150, date: '2024-07-02', status: 'pending' },
            { id: 3, user: 'محمد علي', type: 'bonus', amount: 300, date: '2024-07-03', status: 'completed' },
          ];
        } else {
          data = transactionData?.map(txn => ({
            id: txn.id,
            user: `${txn.user_info?.first_name} ${txn.user_info?.last_name}`,
            type: txn.type,
            amount: txn.amount,
            date: txn.created_at,
            status: txn.status
          })) || [];
        }
        fileName = `transactions_${new Date().toISOString().split('T')[0]}`;
      }
      
      if (format === 'csv') {
        exportToCSV(data, fileName);
      } else if (format === 'pdf') {
        exportToPDF(data, fileName, type);
      }
      
    toast({
      title: t('common.success'),
        description: `${t('admin.export.success')} ${type} ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('admin.export.error'),
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
      setShowExportModal(false);
    }
  };



  // Shared function to process export data
  const processExportData = (data: any[], type: string) => {
    if (data.length === 0) return { filteredData: [], headers: [], fieldMappings: {} };
    
    const isArabic = t('language.switch') === 'English';
    let importantFields: string[] = [];
    let fieldMappings: Record<string, string> = {};
    
    // Determine data type and set important admin-focused fields
    if (data[0].hasOwnProperty('first_name') || data[0].hasOwnProperty('email')) {
      // Users data - comprehensive admin view with all important user metrics
      importantFields = [
        'first_name', 'last_name', 'email', 'phone', 'verified', 'created_at',
        'balance', 'total_earnings', 'personal_earnings', 'team_earnings', 'bonuses',
        'level', 'referral_count', 'total_referral_points', 'referred_by',
        'wallet', 'last_login', 'status', 'total_deposits', 'total_withdrawals'
      ];
      fieldMappings = {
        first_name: isArabic ? 'الاسم الأول' : 'First Name',
        last_name: isArabic ? 'اسم العائلة' : 'Last Name',
        email: isArabic ? 'البريد الإلكتروني' : 'Email',
        phone: isArabic ? 'الهاتف' : 'Phone',
        verified: isArabic ? 'حالة التحقق' : 'Verification Status',
        created_at: isArabic ? 'تاريخ التسجيل' : 'Registration Date',
        balance: isArabic ? 'الرصيد الحالي' : 'Current Balance',
        total_earnings: isArabic ? 'إجمالي الأرباح' : 'Total Earnings',
        personal_earnings: isArabic ? 'الأرباح الشخصية' : 'Personal Earnings',
        team_earnings: isArabic ? 'أرباح الفريق' : 'Team Earnings',
        bonuses: isArabic ? 'المكافآت' : 'Bonuses',
        level: isArabic ? 'المستوى' : 'Level',
        referral_count: isArabic ? 'عدد الإحالات' : 'Referral Count',
        total_referral_points: isArabic ? 'إجمالي نقاط الإحالة' : 'Total Referral Points',
        referred_by: isArabic ? 'تم الإحالة بواسطة' : 'Referred By',
        wallet: isArabic ? 'المحفظة' : 'Wallet',
        last_login: isArabic ? 'آخر تسجيل دخول' : 'Last Login',
        status: isArabic ? 'الحالة' : 'Status',
        total_deposits: isArabic ? 'إجمالي الإيداعات' : 'Total Deposits',
        total_withdrawals: isArabic ? 'إجمالي السحوبات' : 'Total Withdrawals'
      };
    } else if (data[0].hasOwnProperty('type') && data[0].hasOwnProperty('amount')) {
      // Transactions data - admin needs: user, type, amount, date, status
      importantFields = ['user', 'type', 'amount', 'date', 'status'];
      fieldMappings = {
        user: isArabic ? 'المستخدم' : 'User',
        type: isArabic ? 'نوع المعاملة' : 'Transaction Type',
        amount: isArabic ? 'المبلغ' : 'Amount',
        date: isArabic ? 'التاريخ' : 'Date',
        status: isArabic ? 'الحالة' : 'Status'
      };
    } else if (data[0].hasOwnProperty('title') && data[0].hasOwnProperty('description')) {
      // Offers data - admin needs: title, type, reward, deadline, active status
      importantFields = ['title', 'type', 'amount', 'deadline', 'active'];
      fieldMappings = {
        title: isArabic ? 'عنوان العرض' : 'Offer Title',
        type: isArabic ? 'نوع العرض' : 'Offer Type',
        amount: isArabic ? 'المكافأة' : 'Reward',
        deadline: isArabic ? 'تاريخ الانتهاء' : 'Deadline',
        active: isArabic ? 'الحالة' : 'Status'
      };
    } else if (data[0].hasOwnProperty('user') && data[0].hasOwnProperty('amount') && data[0].hasOwnProperty('method')) {
      // Withdrawal data - admin needs: user, amount, method, date, status
      importantFields = ['user', 'amount', 'method', 'date', 'status'];
      fieldMappings = {
        user: isArabic ? 'المستخدم' : 'User',
        amount: isArabic ? 'المبلغ' : 'Amount',
        method: isArabic ? 'طريقة السحب' : 'Withdrawal Method',
        date: isArabic ? 'التاريخ' : 'Date',
        status: isArabic ? 'الحالة' : 'Status'
      };
    } else {
      // Fallback to all fields
      importantFields = Object.keys(data[0]);
      fieldMappings = Object.fromEntries(importantFields.map(field => [field, field]));
    }
    
    // Filter and format data to only include important admin fields
    const filteredData = data.map(row => {
      const filteredRow: any = {};
      importantFields.forEach(field => {
        if (row.hasOwnProperty(field)) {
          let value = row[field];
          
          // Format specific fields for admin readability
          if (field === 'verified') {
            value = value ? (isArabic ? 'محقق' : 'Verified') : (isArabic ? 'غير محقق' : 'Unverified');
          } else if (field === 'active') {
            value = value ? (isArabic ? 'نشط' : 'Active') : (isArabic ? 'غير نشط' : 'Inactive');
          } else if (field === 'created_at' || field === 'date' || field === 'last_login') {
            value = value ? new Date(value).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : (isArabic ? 'غير متوفر' : 'Not Available');
          } else if (field === 'deadline') {
            value = value ? new Date(value).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US') : (isArabic ? 'غير محدد' : 'Not Set');
          } else if (field === 'amount' || field === 'balance' || field === 'total_earnings' || 
                     field === 'personal_earnings' || field === 'team_earnings' || field === 'bonuses' ||
                     field === 'total_deposits' || field === 'total_withdrawals') {
            value = value ? `$${Number(value).toLocaleString()}` : '$0';
          } else if (field === 'level') {
            value = value ? (isArabic ? `المستوى ${value}` : `Level ${value}`) : (isArabic ? 'المستوى 1' : 'Level 1');
          } else if (field === 'referral_count' || field === 'total_referral_points') {
            value = value || '0';
          } else if (field === 'referred_by') {
            value = value || (isArabic ? 'لا يوجد' : 'None');
          } else if (field === 'wallet') {
            const walletMappings = {
              vodafone: isArabic ? 'فودافون كاش' : 'Vodafone Cash',
              orange: isArabic ? 'أورنج كاش' : 'Orange Cash',
              wepay: isArabic ? 'وي باي' : 'We Pay',
              etisalat: isArabic ? 'اتصالات كاش' : 'Etisalat Cash'
            };
            value = value ? walletMappings[value as keyof typeof walletMappings] || value : (isArabic ? 'غير محدد' : 'Not Set');
          } else if (field === 'status') {
            const statusMappings = {
              active: isArabic ? 'نشط' : 'Active',
              inactive: isArabic ? 'غير نشط' : 'Inactive',
              suspended: isArabic ? 'معلق' : 'Suspended',
              pending: isArabic ? 'قيد المعالجة' : 'Pending',
              approved: isArabic ? 'تمت الموافقة' : 'Approved',
              rejected: isArabic ? 'مرفوض' : 'Rejected',
              completed: isArabic ? 'مكتمل' : 'Completed'
            };
            value = value ? statusMappings[value as keyof typeof statusMappings] || value : (isArabic ? 'نشط' : 'Active');
          } else if (field === 'type') {
            const typeMappings = {
              withdrawal: isArabic ? 'سحب' : 'Withdrawal',
              deposit: isArabic ? 'إيداع' : 'Deposit',
              bonus: isArabic ? 'مكافأة' : 'Bonus',
              earning: isArabic ? 'أرباح' : 'Earning',
              trading: isArabic ? 'تداول' : 'Trading',
              referral: isArabic ? 'إحالة' : 'Referral',
              premium: isArabic ? 'متقدم' : 'Premium'
            };
            value = typeMappings[value as keyof typeof typeMappings] || value;
          } else if (field === 'method') {
            const methodMappings = {
              bank: isArabic ? 'تحويل بنكي' : 'Bank Transfer',
              wallet: isArabic ? 'محفظة إلكترونية' : 'Digital Wallet',
              crypto: isArabic ? 'عملة رقمية' : 'Cryptocurrency'
            };
            value = methodMappings[value as keyof typeof methodMappings] || value;
          }
          
          filteredRow[field] = value;
        }
      });
      return filteredRow;
    });
    
    const headers = importantFields.map(field => fieldMappings[field] || field);
    
    return { filteredData, headers, fieldMappings, importantFields };
  };

  // Define region/section mapping
  const getRegionHeaders = (lang: string) => {
    if (lang === 'ar') {
      return [
        { label: 'معلومات المستخدم', span: 7 },
        { label: 'معلومات مالية', span: 7 },
        { label: 'معلومات الإحالة', span: 4 }
      ];
    } else {
      return [
        { label: 'User Info', span: 7 },
        { label: 'Financial Info', span: 7 },
        { label: 'Referral Info', span: 4 }
      ];
    }
  };

  // Update exportToCSV to add region row
  const exportToCSV = (data: any[], fileName: string) => {
    if (data.length === 0) return;
    const { filteredData, headers, importantFields } = processExportData(data, '');
    // CSV escaping and undefined/null handling
    const escapeCSV = (value: any) => {
      if (value === undefined || value === null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row =>
        importantFields.map(field => escapeCSV(row[field])).join(',')
      )
    ].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: t('admin.export.excelSuccess'),
      description: t('admin.export.excelReady'),
    });
  };

  // Add exportToPDF with region headers
  const exportToPDF = (data: any[], fileName: string, type: string) => {
    if (data.length === 0) return;
    const { filteredData, headers, importantFields } = processExportData(data, type);
    const isArabic = t('language.switch') === 'English';
    // Build header row
    const headerRowHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
    // Build data rows
    const dataRowsHTML = filteredData.map(row =>
      '<tr>' + importantFields.map(field => `<td>${row[field] ?? ''}</td>`).join('') + '</tr>'
    ).join('');
    const tableHTML = `
      <html dir="${isArabic ? 'rtl' : 'ltr'}">
        <head>
          <title>${type} Report</title>
          <style>
            body { font-family: ${isArabic ? 'Arial, Tahoma, sans-serif' : 'Arial, sans-serif'}; margin: 20px; direction: ${isArabic ? 'rtl' : 'ltr'}; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 12px 8px; text-align: ${isArabic ? 'right' : 'left'}; }
            th { background-color: #f2f2f2; font-weight: bold; color: #333; }
            h1 { color: #333; text-align: ${isArabic ? 'right' : 'left'}; margin-bottom: 10px; }
            .report-info { text-align: ${isArabic ? 'right' : 'left'}; color: #666; margin-bottom: 20px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            tr:hover { background-color: #f5f5f5; }
          </style>
        </head>
        <body>
          <h1>${type} Report</h1>
          <div class="report-info">
            <p>Generated on: ${new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US')}</p>
            <p>Total Records: ${filteredData.length}</p>
          </div>
          <table>
            <thead>
              ${headerRowHTML}
            </thead>
            <tbody>
              ${dataRowsHTML}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(tableHTML);
      newWindow.document.close();
      newWindow.print();
    }
    toast({
      title: t('admin.export.pdfSuccess'),
      description: t('admin.export.pdfReady'),
    });
  };

  const StatCard = ({ title, value, icon: Icon, color = 'text-primary', trend, trendValue }: { 
    title: string; 
    value: number; 
    icon: React.ComponentType<{ className?: string }>; 
    color?: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: number;
  }) => (
    <Card className="shadow-card hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-1">
                {trend === 'up' ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : trend === 'down' ? (
                  <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />
                ) : (
                  <div className="h-3 w-3" />
                )}
                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'}`}>
                  {trendValue > 0 ? '+' : ''}{trendValue}%
                </span>
          </div>
            )}
          </div>
          <div className="relative">
            <Icon className={`h-8 w-8 ${color}`} />
            {trend === 'up' && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const fetchActiveOffers = async () => {
    const { count } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('active', true);
    setActiveOffers(count || 0);
  };

  useEffect(() => {
    const fetchOffers = async () => {
      setLoadingOffers(true);
      const { data, error } = await supabase.from('offers').select('*');
      if (error) {
        console.error('Error fetching offers:', error);
        setOffers([]);
      } else {
        setOffers(data || []);
      }
      setLoadingOffers(false);
      fetchActiveOffers();
    };
    fetchOffers();
  }, []);

    const fetchUserCount = async () => {
      const { count } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true });
      setUserCount(count || 0);
    };
    const fetchPendingVerifications = async () => {
      const { count } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .eq('verified', false);
      setPendingVerifications(count || 0);
    };

  useEffect(() => {
    fetchUserCount();
    fetchPendingVerifications();
    fetchActiveOffers();
    fetchBadges();
    fetchLevels();
    fetchGamificationSettings();
    fetchUserBadges();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase.from('user_info').select('*');
      if (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
      setLoadingUsers(false);
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const isAdmin = await checkIfUserIsAdmin(user.id);
        if (!isAdmin) {
          navigate('/profile');
        }
      } else {
        navigate('/login');
      }
    };
    checkAdmin();
  }, [navigate]);

  const handleView = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const handleVerify = async (userId) => {
    const { error } = await supabase
      .from('user_info')
      .update({ verified: true })
      .eq('id', userId);
    if (!error) {
      // Refresh users list
      const { data } = await supabase.from('user_info').select('*');
      setUsers(data || []);
      toast({ title: t('common.success'), description: t('admin.userVerified') });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  const handleRemove = async (userId) => {
    const { error } = await supabase
      .from('user_info')
      .delete()
      .eq('id', userId);
    if (!error) {
      // Refresh users list and user count
      const { data } = await supabase.from('user_info').select('*');
      setUsers(data || []);
      toast({ title: t('common.success'), description: t('admin.userRemoved') });
    } else {
      toast({ title: t('common.error'), description: error.message });
    }
  };

  // Add deposit number
  const handleAddNumber = async () => {
    if (!newNumber) return;
    if (depositNumbers.length >= 10) {
      toast({ title: t('common.error'), description: t('deposit.error.maxNumbers'), variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('deposit_numbers').insert([{ number: newNumber }]);
    if (!error) {
      setNewNumber('');
      fetchDepositNumbers(setDepositNumbers, setLoadingDepositNumbers, toast, t);
    }
  };
  // Remove deposit number
  const handleRemoveNumber = async (id) => {
    await supabase.from('deposit_numbers').delete().eq('id', id);
    fetchDepositNumbers(setDepositNumbers, setLoadingDepositNumbers, toast, t);
  };
  // Update deposit number
  const handleUpdateNumber = async (id, number) => {
    await supabase.from('deposit_numbers').update({ number }).eq('id', id);
    fetchDepositNumbers(setDepositNumbers, setLoadingDepositNumbers, toast, t);
  };
  // Approve deposit request
  const handleApproveDeposit = async (request) => {
    // Update request status
    await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', request.id);
    // Update user balance
    const { data: userInfo } = await supabase.from('user_info').select('balance').eq('user_uid', request.user_uid).single();
    const newBalance = (userInfo?.balance || 0) + Number(request.amount);
    await supabase.from('user_info').update({ balance: newBalance }).eq('user_uid', request.user_uid);
    fetchDepositRequests(setDepositRequests, setLoadingDepositRequests, toast, t);
    toast({ title: t('common.success'), description: t('deposit.success') });
  };
  // Reject deposit request
  const handleRejectDeposit = async (id) => {
    await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', id);
    fetchDepositRequests(setDepositRequests, setLoadingDepositRequests, toast, t);
  };

  // Fetch deposit numbers
  const fetchDepositNumbers = async (setDepositNumbers, setLoadingDepositNumbers, toast, t) => {
    setLoadingDepositNumbers(true);
    try {
      const { data, error } = await supabase.from('deposit_numbers').select('*').order('created_at', { ascending: true });
      if (error) {
        console.error('Error fetching deposit numbers:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch deposit numbers', variant: 'destructive' });
      } else {
        setDepositNumbers(data || []);
      }
    } catch (error) {
      console.error('Error fetching deposit numbers:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch deposit numbers', variant: 'destructive' });
    } finally {
      setLoadingDepositNumbers(false);
    }
  };
  // Fetch deposit requests
  const fetchDepositRequests = async (setDepositRequests, setLoadingDepositRequests, toast, t) => {
    setLoadingDepositRequests(true);
    try {
      const { data, error } = await supabase.from('deposit_requests').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching deposit requests:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch deposit requests', variant: 'destructive' });
      } else {
        setDepositRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching deposit requests:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch deposit requests', variant: 'destructive' });
    } finally {
      setLoadingDepositRequests(false);
    }
  };
  useEffect(() => {
    fetchDepositNumbers(setDepositNumbers, setLoadingDepositNumbers, toast, t);
    fetchDepositRequests(setDepositRequests, setLoadingDepositRequests, toast, t);
  }, [toast, t]);

  // Fetch notifications
  const fetchNotifications = async (setNotifications, setLoadingNotifications, toast, t) => {
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching notifications:', error);
        toast({ title: t('common.error'), description: 'Failed to fetch notifications', variant: 'destructive' });
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({ title: t('common.error'), description: 'Failed to fetch notifications', variant: 'destructive' });
    } finally {
      setLoadingNotifications(false);
    }
  };

  // New functions for enhanced features
  const fetchAdvancedStats = async () => {
    try {
      // Fetch monthly deposits
      const startOfCurrentMonth = startOfMonth(new Date());
      const endOfCurrentMonth = endOfMonth(new Date());
      const { data: deposits, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .gte('created_at', startOfCurrentMonth.toISOString())
        .lte('created_at', endOfCurrentMonth.toISOString())
        .eq('status', 'approved');
      
      if (depositsError) {
        console.error('Error fetching monthly deposits:', depositsError);
      } else {
        const totalMonthlyDeposits = deposits?.reduce((sum, deposit) => sum + Number(deposit.amount), 0) || 0;
        setMonthlyDeposits(totalMonthlyDeposits);
      }

      // Fetch weekly new users
      const startOfCurrentWeek = startOfWeek(new Date());
      const endOfCurrentWeek = endOfWeek(new Date());
      const { count: weeklyUsers, error: usersError } = await supabase
        .from('user_info')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfCurrentWeek.toISOString())
        .lte('created_at', endOfCurrentWeek.toISOString())
        .neq('role', 'admin');
      
      if (usersError) {
        console.error('Error fetching weekly users:', usersError);
      } else {
        setWeeklyNewUsers(weeklyUsers || 0);
      }

      // Fetch pending withdrawals (using mock data for now)
      setPendingWithdrawals(15);

      // Calculate average transaction value
      const { data: allDeposits, error: avgError } = await supabase
        .from('deposit_requests')
        .select('amount')
        .eq('status', 'approved');
      
      if (avgError) {
        console.error('Error fetching average transaction value:', avgError);
      } else if (allDeposits && allDeposits.length > 0) {
        const totalAmount = allDeposits.reduce((sum, deposit) => sum + Number(deposit.amount), 0);
        const average = totalAmount / allDeposits.length;
        setAverageTransactionValue(average);
      }
    } catch (error) {
      console.error('Error fetching advanced stats:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      // New users over time (last 30 days)
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: usersOverTime, error: usersError } = await supabase
        .from('user_info')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (usersError) {
        console.error('Error fetching users over time:', usersError);
      }

      // Group by date
      const usersByDate = {};
      usersOverTime?.forEach(user => {
        const date = format(new Date(user.created_at), 'yyyy-MM-dd');
        usersByDate[date] = (usersByDate[date] || 0) + 1;
      });

      const newUsersOverTime = Object.entries(usersByDate).map(([date, count]) => ({
        date,
        count
      }));

      // Transaction types (deposit requests by status)
      const { data: depositRequests, error: depositsError } = await supabase
        .from('deposit_requests')
        .select('status, amount');

      if (depositsError) {
        console.error('Error fetching deposit requests for analytics:', depositsError);
      }

      const transactionTypes = [
        { type: 'approved', count: depositRequests?.filter(r => r.status === 'approved').length || 0 },
        { type: 'pending', count: depositRequests?.filter(r => r.status === 'pending').length || 0 },
        { type: 'rejected', count: depositRequests?.filter(r => r.status === 'rejected').length || 0 }
      ];

      // Activity by hour (mock data for now)
      const activityByHour = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        activity: Math.floor(Math.random() * 50) + 10
      }));

      setAnalyticsData({
        newUsersOverTime,
        transactionTypes,
        activityByHour
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  };

  useEffect(() => { 
    fetchNotifications(setNotifications, setLoadingNotifications, toast, t); 
    fetchAdvancedStats();
    fetchAnalyticsData();
  }, []);

  // Filtering and pagination logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = userSearchTerm === '' || 
      user.first_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.phone?.includes(userSearchTerm);
    
    const matchesStatus = userStatusFilter === 'all' || 
      (userStatusFilter === 'verified' && user.verified) ||
      (userStatusFilter === 'pending' && !user.verified);
    
    const matchesDate = !userDateFilter || 
      format(new Date(user.created_at), 'yyyy-MM-dd') === format(userDateFilter, 'yyyy-MM-dd');
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchTerm, userStatusFilter, userDateFilter]);

  // Fetch number of users joined per offer
  const fetchOfferUserCounts = async (offersList) => {
    if (!offersList || offersList.length === 0) return;
    const offerIds = offersList.map((o) => o.id);
    try {
      const { data, error } = await supabase
        .from('offer_joins')
        .select('offer_id, user_id')
        .in('offer_id', offerIds);
      
      if (error) {
        console.error('Error fetching offer user counts:', error);
        setOfferUserCounts({});
        setOfferProfits({});
        return;
      }

      // Group by offer_id and count users
      const counts = {};
      const profits = {};
      
      data?.forEach((row) => {
        if (!counts[row.offer_id]) {
          counts[row.offer_id] = 0;
        }
        counts[row.offer_id]++;
      });

      // Calculate profits for each offer
      offerIds.forEach((offerId) => {
        const offer = offersList.find((o) => o.id === offerId);
        if (offer && counts[offerId]) {
          // Profit = users * (monthly_profit - cost)
          profits[offerId] = counts[offerId] * ((offer.monthly_profit || 0) - (offer.cost || 0));
        }
      });

      setOfferUserCounts(counts);
      setOfferProfits(profits);
    } catch (error) {
      console.error('Error fetching offer user counts:', error);
      setOfferUserCounts({});
      setOfferProfits({});
    }
  };

  useEffect(() => {
    if (offers.length > 0) {
      fetchOfferUserCounts(offers);
    }
  }, [offers]);

  // Fetch top referrers
  const fetchTopReferrers = async (setTopReferrers, setLoadingReferrers, toast, t) => {
    setLoadingReferrers(true);
    try {
      const { data, error } = await supabase.from('user_info').select('first_name, last_name, email, referral_count, total_referral_points').not('referral_count', 'is', null).order('total_referral_points', { ascending: false }).limit(10);
      if (error) {
        console.error('Error fetching top referrers:', error);
        toast({ title: t('common.error'), description: t('admin.failedToFetchReferrers'), variant: 'destructive' });
        setTopReferrers([]);
      } else {
        setTopReferrers(data || []);
      }
    } catch (error) {
      console.error('Error fetching top referrers:', error);
              toast({ title: t('common.error'), description: t('admin.failedToFetchReferrers'), variant: 'destructive' });
      setTopReferrers([]);
    } finally {
      setLoadingReferrers(false);
    }
  };

  // Update referral settings
  const handleUpdateReferralSettings = async () => {
    const { error } = await supabase
      .from('referral_settings')
      .upsert([{
        id: 1, // Assuming single settings record
        level1_points: referralSettings.level1Points,
        level2_points: referralSettings.level2Points,
        level3_points: referralSettings.level3Points,
        updated_at: new Date().toISOString()
      }]);
    
    if (error) {
      toast({ title: t('common.error'), description: 'Failed to update referral settings', variant: 'destructive' });
    } else {
      toast({ title: t('common.success'), description: 'Referral settings updated successfully' });
    }
  };

  // Load referral settings
  const loadReferralSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        console.error('Error loading referral settings:', error);
        // Use default settings if no settings found
        setReferralSettings({
          level1Points: 100,
          level2Points: 50,
          level3Points: 25
        });
      } else if (data) {
        setReferralSettings({
          level1Points: data.level1_points || 100,
          level2Points: data.level2_points || 50,
          level3Points: data.level3_points || 25
        });
      }
    } catch (error) {
      console.error('Error loading referral settings:', error);
      // Use default settings on error
      setReferralSettings({
        level1Points: 100,
        level2Points: 50,
        level3Points: 25
      });
    }
  };

  useEffect(() => {
    loadReferralSettings();
    fetchTopReferrers(setTopReferrers, setLoadingReferrers, toast, t);
  }, [toast, t]);

  // Fetch withdrawals and group by day
  const fetchWithdrawals = async () => {
    setLoadingWithdrawals(true);
    const { data, error } = await supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setWithdrawals(data);
      // Group by day
      const grouped = {};
      data.forEach(w => {
        const day = w.created_at.split('T')[0];
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push(w);
      });
      setGroupedWithdrawals(grouped);
    }
    setLoadingWithdrawals(false);
  };
  useEffect(() => { fetchWithdrawals(); }, []);

  // Fetch settings (time slots, package limits)
  const fetchSettings = async () => {
    setSettingsLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('key', 'withdrawal_time_slots').single();
    setTimeSlots(data?.value || []);
    const { data: pkg } = await supabase.from('settings').select('*').eq('key', 'package_withdrawal_limits').single();
    setPackageLimits(pkg?.value || {});
    setSettingsLoading(false);
  };
  useEffect(() => { fetchSettings(); }, []);

  // Pay withdrawal
  const handlePay = async () => {
    let imageUrl = '';
    if (proofImage) {
      const fileExt = proofImage.name.split('.').pop();
      const fileName = `${selectedWithdrawal.id}_${Date.now()}.${fileExt}`;
      const filePath = `withdrawal-proofs/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('withdrawal-proofs').upload(filePath, proofImage);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('withdrawal-proofs').getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }
    }
    await supabase.from('withdrawal_requests').update({ status: 'paid', admin_note: adminNote, proof_image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', selectedWithdrawal.id);
    setShowPayModal(false);
    setAdminNote('');
    setProofImage(null);
    fetchWithdrawals();
  };
  // Reject withdrawal
  const handleReject = async () => {
    await supabase.from('withdrawal_requests').update({ status: 'rejected', rejection_reason: rejectionReason, updated_at: new Date().toISOString() }).eq('id', selectedWithdrawal.id);
    setShowRejectModal(false);
    setRejectionReason('');
    fetchWithdrawals();
  };
  // Update time slots
  const handleSaveTimeSlots = async () => {
    await supabase.from('settings').upsert({ key: 'withdrawal_time_slots', value: timeSlots });
    fetchSettings();
  };
  // Update package limits
  const handleSavePackageLimits = async () => {
    await supabase.from('settings').upsert({ key: 'package_withdrawal_limits', value: packageLimits });
    fetchSettings();
  };

  // Gamification functions
  const fetchBadges = async () => {
    setLoadingBadges(true);
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error('Error fetching badges:', error);
      toast({ title: t('common.error'), description: 'Failed to load badges', variant: 'destructive' });
    } finally {
      setLoadingBadges(false);
    }
  };

  const fetchLevels = async () => {
    setLoadingLevels(true);
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level', { ascending: true });
      
      if (error) throw error;
      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
      toast({ title: t('common.error'), description: 'Failed to load levels', variant: 'destructive' });
    } finally {
      setLoadingLevels(false);
    }
  };

  const fetchGamificationSettings = async () => {
    setLoadingGamification(true);
    try {
      const { data, error } = await supabase
        .from('gamification_settings')
        .select('*');
      
      if (error) throw error;
      
      const settings = {};
      data?.forEach(setting => {
        settings[setting.key] = setting.value;
      });
      setGamificationSettings(settings);
    } catch (error) {
      console.error('Error fetching gamification settings:', error);
      toast({ title: t('common.error'), description: 'Failed to load gamification settings', variant: 'destructive' });
    } finally {
      setLoadingGamification(false);
    }
  };

  const fetchUserBadges = async () => {
    try {
      // Fetch all user badges
      const { data: badges, error: badgeError } = await supabase
        .from('user_badges')
        .select('*, badge:badge_id(*)')
        .order('earned_at', { ascending: false });
      if (badgeError) throw badgeError;

      // Fetch all user info
      const { data: users, error: userError } = await supabase
        .from('user_info')
        .select('user_uid, email, first_name, last_name');
      if (userError) throw userError;

      // Merge user info into badges
      const userMap = Object.fromEntries((users || []).map(u => [u.user_uid, u]));
      const badgesWithUser = (badges || []).map(b => ({
        ...b,
        user: userMap[b.user_id] || null
      }));
      setUserBadges(badgesWithUser);
    } catch (error) {
      console.error('Error fetching user badges:', error);
    }
  };

  const handleCreateBadge = async () => {
    try {
      if (selectedBadge) {
        // Update existing badge
        const { error } = await supabase
          .from('badges')
          .update(badgeForm)
          .eq('id', selectedBadge.id);
        
        if (error) throw error;
        
        toast({ title: t('common.success'), description: 'Badge updated successfully' });
      } else {
        // Create new badge
        const { error } = await supabase
          .from('badges')
          .insert([badgeForm]);
        
        if (error) throw error;
        
        toast({ title: t('common.success'), description: 'Badge created successfully' });
      }
      
      setShowBadgeModal(false);
      setSelectedBadge(null);
      setBadgeForm({
        name: '',
        description: '',
        type: 'achievement',
        requirement: 1,
        points_awarded: 0,
        is_active: true
      });
      fetchBadges();
    } catch (error) {
      console.error('Error creating/updating badge:', error);
      toast({ title: t('common.error'), description: 'Failed to save badge', variant: 'destructive' });
    }
  };

  const handleUpdateBadge = async (badgeId, updates) => {
    try {
      const { error } = await supabase
        .from('badges')
        .update(updates)
        .eq('id', badgeId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'Badge updated successfully' });
      fetchBadges();
    } catch (error) {
      console.error('Error updating badge:', error);
      toast({ title: t('common.error'), description: 'Failed to update badge', variant: 'destructive' });
    }
  };

  const handleDeleteBadge = async (badgeId) => {
    try {
      const { error } = await supabase
        .from('badges')
        .delete()
        .eq('id', badgeId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'Badge deleted successfully' });
      fetchBadges();
      setShowDeleteConfirm(false);
      setDeleteItem({ type: '', id: null, name: '' });
    } catch (error) {
      console.error('Error deleting badge:', error);
      toast({ title: t('common.error'), description: 'Failed to delete badge', variant: 'destructive' });
    }
  };

  const handleDeleteLevel = async (levelId) => {
    try {
      const { error } = await supabase
        .from('levels')
        .delete()
        .eq('id', levelId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'Level deleted successfully' });
      fetchLevels();
      setShowDeleteConfirm(false);
      setDeleteItem({ type: '', id: null, name: '' });
    } catch (error) {
      console.error('Error deleting level:', error);
      toast({ title: t('common.error'), description: 'Failed to delete level', variant: 'destructive' });
    }
  };

  const handleDeleteUserBadge = async (userBadgeId) => {
    try {
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('id', userBadgeId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'User badge removed successfully' });
      fetchUserBadges();
      setShowDeleteConfirm(false);
      setDeleteItem({ type: '', id: null, name: '' });
    } catch (error) {
      console.error('Error deleting user badge:', error);
      toast({ title: t('common.error'), description: 'Failed to remove user badge', variant: 'destructive' });
    }
  };

  const confirmDelete = (type, id, name) => {
    setDeleteItem({ type, id, name });
    setShowDeleteConfirm(true);
  };

  const handleGamificationDelete = async () => {
    switch (deleteItem.type) {
      case 'badge':
        await handleDeleteBadge(deleteItem.id);
        break;
      case 'level':
        await handleDeleteLevel(deleteItem.id);
        break;
      case 'userBadge':
        await handleDeleteUserBadge(deleteItem.id);
        break;
      default:
        break;
    }
  };

  const handleCreateLevel = async () => {
    try {
      if (selectedLevel) {
        // Update existing level
        const { error } = await supabase
          .from('levels')
          .update({
            level: levelForm.level,
            name: levelForm.name,
            description: levelForm.description,
            requirement: levelForm.requirement,
            benefits: levelForm.benefits
          })
          .eq('id', selectedLevel.id);
        
        if (error) throw error;
        
        toast({ title: t('common.success'), description: 'Level updated successfully' });
      } else {
        // Create new level
        const { error } = await supabase
          .from('levels')
          .insert([
            {
              level: levelForm.level,
              name: levelForm.name,
              description: levelForm.description,
              requirement: levelForm.requirement,
              benefits: levelForm.benefits
            }
          ]);
        
        if (error) throw error;
        
        toast({ title: t('common.success'), description: 'Level created successfully' });
      }
      
      setShowLevelModal(false);
      setSelectedLevel(null);
      setLevelForm({
        level: 1,
        name: '',
        description: '',
        requirement: 100,
        benefits: ''
      });
      fetchLevels();
    } catch (error) {
      console.error('Error creating/updating level:', error);
      toast({ title: t('common.error'), description: 'Failed to save level', variant: 'destructive' });
    }
  };

  const handleUpdateLevel = async (levelId, updates) => {
    try {
      const { error } = await supabase
        .from('levels')
        .update(updates)
        .eq('id', levelId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'Level updated successfully' });
      fetchLevels();
    } catch (error) {
      console.error('Error updating level:', error);
      toast({ title: t('common.error'), description: 'Failed to update level', variant: 'destructive' });
    }
  };

  const handleCreateUserBadge = async () => {
    try {
      if (selectedUserBadge) {
        // Update existing user badge
        const { error } = await supabase
          .from('user_badges')
          .update({
            user_id: userBadgeForm.user_id,
            badge_id: userBadgeForm.badge_id,
            points_earned: userBadgeForm.points_earned
          })
          .eq('id', selectedUserBadge.id);
        
        if (error) throw error;
        
        toast({ title: t('common.success'), description: 'User badge updated successfully' });
      } else {
        // Add new user badge (upsert to avoid unique constraint error)
        const badgePayload = {
          user_id: userBadgeForm.user_id,
          badge_id: userBadgeForm.badge_id,
          points_earned: userBadgeForm.points_earned,
          earned_at: new Date().toISOString()
        };
        console.log('Assigning badge:', badgePayload);
        const { error } = await supabase
          .from('user_badges')
          .upsert([
            badgePayload
          ], { onConflict: 'user_id,badge_id' });
        if (error) {
          console.error('Supabase error:', error, 'Payload:', badgePayload);
          toast({ title: t('common.error'), description: error.message || 'Failed to save user badge', variant: 'destructive' });
          return;
        }
        toast({ title: t('common.success'), description: 'User badge assigned successfully' });
      }
      setShowUserBadgeModal(false);
      setSelectedUserBadge(null);
      setUserBadgeForm({
        user_id: '',
        badge_id: '',
        points_earned: 0
      });
      fetchUserBadges();
    } catch (error) {
      console.error('Error creating/updating user badge:', error, userBadgeForm);
      toast({ title: t('common.error'), description: error.message || 'Failed to save user badge', variant: 'destructive' });
    }
  };

  const handleUpdateUserBadge = async (userBadgeId, updates) => {
    try {
      const { error } = await supabase
        .from('user_badges')
        .update(updates)
        .eq('id', userBadgeId);
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'User badge updated successfully' });
      fetchUserBadges();
    } catch (error) {
      console.error('Error updating user badge:', error);
      toast({ title: t('common.error'), description: 'Failed to update user badge', variant: 'destructive' });
    }
  };

  const handleUpdateGamificationSettings = async (key, value) => {
    try {
      const { error } = await supabase
        .from('gamification_settings')
        .upsert({ key, value: JSON.stringify(value) });
      
      if (error) throw error;
      
      toast({ title: t('common.success'), description: 'Settings updated successfully' });
      fetchGamificationSettings();
    } catch (error) {
      console.error('Error updating gamification settings:', error);
      toast({ title: t('common.error'), description: 'Failed to update settings', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
              {t('admin.title')}
            </h1>
            <p className="text-muted-foreground">{t('admin.overview')}</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
            <StatCard 
              title={t('admin.stats.totalUsers')} 
              value={userCount} 
              icon={Users} 
              color="text-blue-600" 
            />
            <StatCard 
              title={t('admin.stats.pendingVerifications')} 
              value={pendingVerifications} 
              icon={FileCheck} 
              color="text-orange-600" 
            />
            <StatCard 
              title={t('admin.stats.activeOffers')} 
              value={activeOffers} 
              icon={Gift} 
              color="text-green-600" 
            />
            <StatCard 
              title={t('admin.monthlyDeposits')} 
              value={monthlyDeposits} 
              icon={TrendingUp} 
              color="text-purple-600" 
            />
            <StatCard 
              title={t('admin.weeklyNewUsers')} 
              value={weeklyNewUsers} 
              icon={Users} 
              color="text-indigo-600" 
            />
            <StatCard 
              title={t('admin.avgTransactionValue')} 
              value={Math.round(averageTransactionValue)} 
              icon={BarChart3} 
              color="text-teal-600" 
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-10 h-auto p-1 bg-muted/50">
              <TabsTrigger value="users" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <Users className="h-4 w-4" />
                <span className="text-xs">{t('admin.users')}</span>
                {userCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {userCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="offers" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <Gift className="h-4 w-4" />
                <span className="text-xs">{t('admin.offers')}</span>
                {activeOffers > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {activeOffers}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="referrals" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <Users2 className="h-4 w-4" />
                <span className="text-xs">{t('admin.referrals')}</span>
                {topReferrers.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {topReferrers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="withdrawals" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">{t('admin.withdrawals')}</span>
                {pendingWithdrawals > 0 && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
                    {pendingWithdrawals}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <FileCheck className="h-4 w-4" />
                <span className="text-xs">{t('admin.transactions')}</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs">{t('admin.analytics')}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <Bell className="h-4 w-4" />
                <span className="text-xs">{t('admin.notifications')}</span>
                {notifications.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {notifications.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="depositNumbers" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">{t('deposit.numbers') || 'Deposit Numbers'}</span>
                {depositNumbers.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {depositNumbers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="depositRequests" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <FileCheck className="h-4 w-4" />
                <span className="text-xs">{t('deposit.requests') || 'Deposit Requests'}</span>
                {depositRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 h-5">
                    {depositRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="adminChat" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">{t('admin.supportChat') || 'Support Chat'}</span>
              </TabsTrigger>
              <TabsTrigger value="gamification" className="flex flex-col items-center gap-1 py-3 px-2 data-[state=active]:bg-background">
                <Award className="h-4 w-4" />
                <span className="text-xs">{t('admin.gamification') || 'Gamification'}</span>
                {badges.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                    {badges.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.users')}</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => handleExport(t('admin.users'))} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.export.users')}
                  </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Search and Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder={t('admin.searchPlaceholder')}
                          value={userSearchTerm}
                          onChange={(e) => setUserSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                        {userSearchTerm && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                            onClick={() => setUserSearchTerm('')}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder={t('admin.verificationStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
                        <SelectItem value="verified">{t('admin.verified')}</SelectItem>
                        <SelectItem value="pending">{t('admin.pending')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-48">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {userDateFilter ? format(userDateFilter, 'yyyy-MM-dd') : t('admin.registrationDate')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={userDateFilter}
                          onSelect={setUserDateFilter}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setUserSearchTerm('');
                          setUserStatusFilter('all');
                          setUserDateFilter(undefined);
                        }}
                      >
                        {t('admin.clearFilters')}
                      </Button>
                    </div>
                  </div>

                  {/* Filtered Users Table */}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.users.name')}</TableHead>
                        <TableHead>{t('admin.users.email')}</TableHead>
                        <TableHead>{t('admin.users.phone')}</TableHead>
                        <TableHead>{t('admin.users.status')}</TableHead>
                        <TableHead>{t('admin.users.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingUsers ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {t('admin.loading')}
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {t('admin.noUsers')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone}</TableCell>
                          <TableCell>
                              <Badge className={user.verified ? 'bg-success' : 'bg-warning'}>
                                {user.verified ? 'Verified' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleView(user)}>
                                  {t('admin.view')}
                              </Button>
                                {!user.verified && (
                                  <Button size="sm" className="bg-success" onClick={() => handleVerify(user.id)}>
                                    {t('admin.verify')}
                                </Button>
                              )}
                                <Button size="sm" variant="destructive" onClick={() => handleRemove(user.id)}>
                                  {t('admin.remove')}
                                </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {filteredUsers.length > itemsPerPage && (
                    <div className="mt-6">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, i) => (
                            <PaginationItem key={i + 1}>
                              <PaginationLink
                                onClick={() => setCurrentPage(i + 1)}
                                isActive={currentPage === i + 1}
                                className="cursor-pointer"
                              >
                                {i + 1}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredUsers.length / itemsPerPage)))}
                              className={currentPage === Math.ceil(filteredUsers.length / itemsPerPage) ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.offers')}</CardTitle>
                  <Button onClick={() => navigate('/manage-offers')} className="mt-4">
                    {t('admin.manageOffers')}
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingOffers ? (
                    <div>Loading...</div>
                  ) : (
                    <OffersTable 
                      offers={offers} 
                      showActions={false}
                      renderExtra={(offer) => (
                        <div className="flex flex-col gap-1 text-xs">
                          <span><b>{t('admin.usersCount')}</b> {offerUserCounts[offer.id] || 0}</span>
                          <span><b>{t('admin.profitLoss')}</b> ${offerProfits[offer.id] !== undefined ? offerProfits[offer.id].toLocaleString() : '0'}</span>
                        </div>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Withdrawals Tab */}
            <TabsContent value="withdrawals">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('admin.withdrawals.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingWithdrawals ? (
                    <div>Loading...</div>
                  ) : Object.keys(groupedWithdrawals).length === 0 ? (
                    <div>{t('admin.withdrawals.noRequests')}</div>
                  ) : (
                    Object.entries(groupedWithdrawals).map(([day, list]) => (
                      <div key={day} className="mb-8">
                        <h3 className="font-semibold mb-2">{day}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.withdrawals.user')}</TableHead>
                              <TableHead>{t('profile.phone')}</TableHead>
                              <TableHead>{t('admin.withdrawals.wallet')}</TableHead>
                        <TableHead>{t('admin.withdrawals.amount')}</TableHead>
                              <TableHead>{t('offers.title')}</TableHead>
                              <TableHead>{t('admin.withdrawals.status')}</TableHead>
                        <TableHead>{t('admin.withdrawals.date')}</TableHead>
                        <TableHead>{t('admin.users.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                            {list.map(w => (
                              <TableRow key={w.id}>
                                <TableCell>{w.user_name}</TableCell>
                                <TableCell>{w.phone_number}</TableCell>
                                <TableCell>{w.wallet_type}</TableCell>
                                <TableCell>${w.amount}</TableCell>
                                <TableCell>{w.package_id}</TableCell>
                                <TableCell>{w.status}</TableCell>
                                <TableCell>{w.created_at.split('T')[0]}</TableCell>
                          <TableCell>
                                  {w.status === 'pending' && (
                                    <>
                                      <Button size="sm" className="bg-success mr-2" onClick={() => { setSelectedWithdrawal(w); setShowPayModal(true); }}>{t('admin.withdrawals.approve')}</Button>
                                      <Button size="sm" variant="destructive" onClick={() => { setSelectedWithdrawal(w); setShowRejectModal(true); }}>{t('admin.withdrawals.reject')}</Button>
                                    </>
                                  )}
                                  {w.status === 'paid' && w.proof_image_url && (
                                    <a href={w.proof_image_url} target="_blank" rel="noopener noreferrer">{t('admin.proof')}</a>
                                  )}
                          </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              {/* Pay Modal */}
              {showPayModal && selectedWithdrawal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="bg-background p-6 rounded shadow-lg min-w-[300px]">
                    <h2 className="text-xl font-bold mb-4">{t('admin.confirmPay')}</h2>
                    <div className="mb-2">{t('admin.withdrawals.user')}: {selectedWithdrawal.user_name}</div>
                    <div className="mb-2">{t('admin.withdrawals.amount')}: ${selectedWithdrawal.amount}</div>
                    <div className="mb-2">
                      <Label>{t('admin.adminNote')}</Label>
                      <Input value={adminNote} onChange={e => setAdminNote(e.target.value)} />
                    </div>
                    <div className="mb-2">
                      <Label>{t('admin.proofImage')}</Label>
                      <Input type="file" accept="image/*" onChange={e => setProofImage(e.target.files[0])} />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handlePay} className="bg-success">{t('admin.confirmPay')}</Button>
                      <Button variant="destructive" onClick={() => setShowPayModal(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Reject Modal */}
              {showRejectModal && selectedWithdrawal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="bg-background p-6 rounded shadow-lg min-w-[300px]">
                    <h2 className="text-xl font-bold mb-4">{t('admin.rejectTitle')}</h2>
                    <div className="mb-2">{t('admin.withdrawals.user')}: {selectedWithdrawal.user_name}</div>
                    <div className="mb-2">{t('admin.withdrawals.amount')}: ${selectedWithdrawal.amount}</div>
                    <div className="mb-2">
                      <Label>{t('admin.rejectionReason')}</Label>
                      <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={handleReject} variant="destructive">{t('admin.withdrawals.reject')}</Button>
                      <Button onClick={() => setShowRejectModal(false)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                </div>
              )}
              {/* Settings UI */}
              <Card className="shadow-card mt-8">
                <CardHeader>
                                  <CardTitle>{t('admin.settings')}</CardTitle>
                </CardHeader>
                <CardContent className="bg-background text-foreground">
                  {/* Withdrawal Time Slots Visual Editor */}
                  <div className="mb-8">
                    <Label className="text-base font-semibold flex items-center gap-2 text-foreground">
                      <span>{t('admin.timeSlots')}</span>
                      <span className="text-xs text-muted-foreground" title="Set allowed withdrawal times (day, start hour, end hour)">🛈</span>
                    </Label>
                    <div className="flex flex-wrap gap-4 items-end mb-2 mt-2">
                      <select value={newTimeSlotDay} onChange={e => setNewTimeSlotDay(e.target.value)} className="border border-border rounded px-2 py-1 bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                        <option value="">Day</option>
                        <option value="0">Sunday</option>
                        <option value="1">Monday</option>
                        <option value="2">Tuesday</option>
                        <option value="3">Wednesday</option>
                        <option value="4">Thursday</option>
                        <option value="5">Friday</option>
                        <option value="6">Saturday</option>
                      </select>
                      <input type="number" min="0" max="23" value={newTimeSlotStart} onChange={e => setNewTimeSlotStart(e.target.value)} placeholder="Start Hour" className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder-zinc-400" />
                      <input type="number" min="1" max="24" value={newTimeSlotEnd} onChange={e => setNewTimeSlotEnd(e.target.value)} placeholder="End Hour" className="border border-border rounded px-2 py-1 w-24 bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 placeholder:text-muted-foreground dark:placeholder-zinc-400" />
                      <Button size="sm" className="bg-success text-white dark:bg-green-700" onClick={handleAddTimeSlot} disabled={!newTimeSlotDay || !newTimeSlotStart || !newTimeSlotEnd || Number(newTimeSlotEnd) <= Number(newTimeSlotStart)}>
                        {t('common.save') || 'Add'}
                              </Button>
                            </div>
                    <div className="mb-2 text-xs text-muted-foreground">Current Time Slots:</div>
                    <ul className="list-disc ml-5 mb-2">
                      {timeSlots.map((slot, idx) => {
                        const [day, start, end] = slot.split(':');
                        return (
                          <li key={idx} className="flex items-center gap-2">
                            <span><b>{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day]}</b>: {start}:00 - {end}:00</span>
                            <Button size="sm" variant="destructive" onClick={() => handleRemoveTimeSlot(idx)}>{t('common.delete') || 'Delete'}</Button>
                          </li>
                        );
                      })}
                      {timeSlots.length === 0 && <li className="text-muted-foreground">None set</li>}
                    </ul>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTimeSlots} className="mt-2" disabled={timeSlots.some(slot => !/^\d+:\d+:\d+$/.test(slot))}>{t('admin.saveTimeSlots')}</Button>
                      <Button variant="outline" className="mt-2" onClick={() => fetchSettings()}>{t('common.cancel') || 'Reset'}</Button>
                    </div>
                  </div>
                  <hr className="my-6 border-muted" />
                  {/* Package Withdrawal Limits Visual Editor */}
                  <div>
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span>{t('admin.packageLimits')}</span>
                      <span className="text-xs text-muted-foreground" title="Set withdrawal limits for each package">🛈</span>
                    </Label>
                    <form className="flex flex-wrap gap-2 items-end mt-2 mb-2" onSubmit={handleAddOrUpdatePackageLimit}>
                      <Input value={packageFormName} onChange={e => setPackageFormName(e.target.value)} placeholder="Package Name" className="w-32" />
                      <Input type="number" value={packageFormMin} onChange={e => setPackageFormMin(e.target.value)} placeholder="Min" className="w-20" />
                      <Input type="number" value={packageFormMax} onChange={e => setPackageFormMax(e.target.value)} placeholder="Max" className="w-20" />
                      <Input type="number" value={packageFormDaily} onChange={e => setPackageFormDaily(e.target.value)} placeholder="Daily" className="w-20" />
                      <Button size="sm" className="bg-success" type="submit" disabled={!packageFormName || !packageFormMin || !packageFormMax || !packageFormDaily}>{packageEditIndex === null ? (t('common.save') || 'Add') : (t('common.edit') || 'Edit')}</Button>
                      {packageEditIndex !== null && <Button size="sm" variant="outline" onClick={handleCancelEditPackageLimit}>{t('common.cancel') || 'Cancel'}</Button>}
                    </form>
                    <div className="mb-2 text-xs text-muted-foreground">Current Package Limits:</div>
                    <Table className="mb-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Package</TableHead>
                          <TableHead>Min</TableHead>
                          <TableHead>Max</TableHead>
                          <TableHead>Daily</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(packageLimits).map(([pkg, vals], idx) => (
                          <TableRow key={pkg}>
                            <TableCell>{pkg}</TableCell>
                            <TableCell>{vals.min}</TableCell>
                            <TableCell>{vals.max}</TableCell>
                            <TableCell>{vals.daily}</TableCell>
                            <TableCell>
                              <Button size="xs" variant="outline" onClick={() => handleEditPackageLimit(pkg, vals, idx)}>{t('common.edit') || 'Edit'}</Button>
                              <Button size="xs" variant="destructive" onClick={() => handleRemovePackageLimit(pkg)}>{t('common.delete') || 'Delete'}</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                        {Object.keys(packageLimits).length === 0 && (
                          <TableRow><TableCell colSpan={5} className="text-muted-foreground">None set</TableCell></TableRow>
                        )}
                    </TableBody>
                  </Table>
                    <div className="flex gap-2">
                      <Button onClick={handleSavePackageLimits} className="mt-2" disabled={Object.keys(packageLimits).length === 0}>{t('admin.savePackageLimits')}</Button>
                      <Button variant="outline" className="mt-2" onClick={() => fetchSettings()}>{t('common.cancel') || 'Reset'}</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.transactions')}</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => handleExport(t('admin.transactions'))} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('admin.export.transactions')}
                  </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    {t('admin.transactions.log')}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.analytics')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-8`}>
                    {/* Line Chart: New Users Over Time */}
                    <div>
                      <h3 className="font-semibold mb-2">{t('admin.analytics.newUsersOverTime')}</h3>
                      <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-2">{t('admin.analytics.chartPlaceholder')}</p>
                          <div className="text-sm text-muted-foreground">
                            <p>{t('admin.analytics.newUsers')}: {analyticsData.newUsersOverTime.reduce((sum, item) => sum + (item.count || 0), 0)}</p>
                            <p>{t('admin.analytics.date')}: {analyticsData.newUsersOverTime.length > 0 ? analyticsData.newUsersOverTime[0].date : 'N/A'} - {analyticsData.newUsersOverTime.length > 0 ? analyticsData.newUsersOverTime[analyticsData.newUsersOverTime.length - 1].date : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pie Chart: Transaction Types */}
                    <div>
                      <h3 className="font-semibold mb-2">{t('admin.analytics.transactionTypes')}</h3>
                      <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-2">{t('admin.analytics.chartPlaceholder')}</p>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {analyticsData.transactionTypes.map((type, index) => (
                              <p key={index}>
                                {t(`admin.analytics.${type.type}`)}: {type.count}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Bar Chart: Activity By Hour */}
                    <div className="md:col-span-2">
                      <h3 className="font-semibold mb-2">{t('admin.analytics.activityByHour')}</h3>
                      <div className="h-[300px] bg-muted rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-2">{t('admin.analytics.chartPlaceholder')}</p>
                          <div className="text-sm text-muted-foreground">
                            <p>{t('admin.analytics.activity')}: {analyticsData.activityByHour.reduce((sum, item) => sum + (item.activity || 0), 0)}</p>
                            <p>{t('admin.analytics.hour')}: 0-23</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <div className="w-full px-0 md:px-0">
                <Card className="shadow-card w-full">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    {t('admin.notifications')}
                  </CardTitle>
                </CardHeader>
                  <CardContent className="space-y-6 h-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 h-full w-full">
                      {/* Notification Form */}
                      <div className="space-y-5 bg-card rounded-xl p-6 border border-border shadow-glow h-full flex flex-col flex-1">
                      <div className="space-y-2">
                        <Label htmlFor="notificationTitle">{t('admin.notifications.title')}</Label>
                        <Input
                          id="notificationTitle"
                          value={notificationData.title}
                          onChange={(e) => setNotificationData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('admin.notifications.title')}
                            className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notificationMessage">{t('admin.notifications.message')}</Label>
                        <textarea
                          id="notificationMessage"
                          value={notificationData.message}
                          onChange={(e) => setNotificationData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder={t('admin.notifications.message')}
                            className="flex h-32 w-full rounded-lg border border-border bg-muted px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none transition-all text-foreground"
                        />
                      </div>
                        <div className="space-y-2">
                          <Label>{t('admin.notifications.type')}</Label>
                          <select className="w-full border rounded-lg px-2 py-2 bg-muted text-foreground border-border focus:ring-2 focus:ring-primary/60 transition-all" value={notificationData.type} onChange={e => setNotificationData(prev => ({ ...prev, type: e.target.value }))}>
                            <option value="info">{t('admin.notifications.type.info')}</option>
                            <option value="offer">{t('admin.notifications.type.offer')}</option>
                            <option value="ad">{t('admin.notifications.type.ad')}</option>
                            <option value="warning">{t('admin.notifications.type.warning')}</option>
                            <option value="success">{t('admin.notifications.type.success')}</option>
                            <option value="error">{t('admin.notifications.type.error')}</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('admin.notifications.target')}</Label>
                          <select className="w-full border rounded-lg px-2 py-2 bg-muted text-foreground border-border focus:ring-2 focus:ring-primary/60 transition-all" value={notificationData.target} onChange={e => setNotificationData(prev => ({ ...prev, target: e.target.value, targetValue: '' }))}>
                            <option value="all">{t('admin.notifications.target.all')}</option>
                            <option value="user">{t('admin.notifications.target.user')}</option>
                          </select>
                          {notificationData.target === 'user' && (
                            <Input
                              value={notificationData.targetValue}
                              onChange={e => setNotificationData(prev => ({ ...prev, targetValue: e.target.value }))}
                              placeholder={t('admin.notifications.target.placeholder')}
                              className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="banner" checked={notificationData.banner} onChange={e => setNotificationData(prev => ({ ...prev, banner: e.target.checked }))} className="accent-primary w-4 h-4 rounded focus:ring-2 focus:ring-primary/60 transition-all" />
                          <Label htmlFor="banner">{t('admin.notifications.banner')}</Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scheduledAt">{t('admin.notifications.schedule')}</Label>
                          <Input
                            id="scheduledAt"
                            type="datetime-local"
                            value={notificationData.scheduledAt}
                            onChange={e => setNotificationData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                            className="focus:ring-2 focus:ring-primary/60 transition-all bg-muted text-foreground border-border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('admin.notifications.image')}</Label>
                          <label className="block w-full cursor-pointer bg-muted border border-dashed border-primary/40 rounded-lg p-3 text-center hover:bg-primary/10 transition-all">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />
                            <span className="text-sm text-primary-foreground">{t('common.chooseFile') || 'Choose File'}</span>
                          </label>
                          {notificationData.imageUrl && (
                            <img src={notificationData.imageUrl} alt="preview" className="max-w-[120px] mt-2 rounded-lg border border-border shadow" />
                          )}
                        </div>
                        <Button onClick={handleSendNotification} className="w-full shadow-glow text-lg py-3">
                          {t('admin.notifications.send')}
                      </Button>
                    </div>
                      {/* Divider for large screens */}
                      <div className="hidden md:block h-full w-px bg-border mx-2" aria-hidden="true"></div>
                      {/* Notification Preview */}
                      <Card className="bg-accent/60 border border-border shadow-glow rounded-xl h-full flex flex-col flex-1">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold">{t('common.view')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <h5 className="font-bold text-primary-foreground text-xl">{notificationData.title || t('admin.notifications.title')}</h5>
                            <p className="text-base text-muted-foreground mt-1 min-h-[48px]">{notificationData.message || t('admin.notifications.message')}</p>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs">
                              <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.type')}: {t(`admin.notifications.type.${notificationData.type}`)}</span>
                              <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.banner')}: {notificationData.banner ? t('common.success') : t('common.cancel')}</span>
                              {notificationData.scheduledAt && <span className="bg-muted px-2 py-1 rounded">{t('admin.notifications.scheduledAt')}: {notificationData.scheduledAt}</span>}
                      </div>
                            {notificationData.imageUrl && (
                              <img src={notificationData.imageUrl} alt="preview" className="max-w-[120px] mt-3 rounded-lg border border-border shadow" />
                            )}
                    </div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="mt-8 w-full">
                      <h4 className="font-semibold mb-4">{t('admin.notifications')}</h4>
                      {loadingNotifications ? (
                        <div>{t('common.loading')}</div>
                      ) : notifications.length === 0 ? (
                        <div>{t('admin.notifications.noNotifications')}</div>
                      ) : (
                        <Table className="bg-card border border-border rounded-xl shadow-glow">
                          <TableHeader className="bg-muted">
                            <TableRow className="border-b border-border">
                              <TableHead className="text-foreground">{t('admin.notifications.title')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.type')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.target')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.banner')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.scheduledAt')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.status')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.image')}</TableHead>
                              <TableHead className="text-foreground">{t('admin.notifications.actions')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody className="bg-card">
                            {notifications.map((notif) => (
                              <TableRow key={notif.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <TableCell className="text-foreground">{notif.title}</TableCell>
                                <TableCell className="text-foreground">{t(`admin.notifications.type.${notif.type}`)}</TableCell>
                                <TableCell className="text-foreground">{notif.user_uid ? notif.user_uid : t('admin.notifications.target.all')}</TableCell>
                                <TableCell className="text-foreground">{notif.banner ? t('common.success') : t('common.cancel')}</TableCell>
                                <TableCell className="text-foreground">{notif.scheduled_at ? format(new Date(notif.scheduled_at), 'yyyy-MM-dd HH:mm') : '-'}</TableCell>
                                <TableCell className="text-foreground">{notif.sent_at ? t('admin.notifications.status.sent') : notif.scheduled_at ? t('admin.notifications.status.scheduled') : '-'}</TableCell>
                                <TableCell>
                                  {notif.image_url && <img src={notif.image_url} alt="notif" className="max-w-[60px] rounded-lg border border-border shadow" />}
                                </TableCell>
                                <TableCell>
                                  <Button size="sm" variant="outline" className="mr-2" onClick={() => handleEdit(notif)}>{t('common.edit') || 'Edit'}</Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleDelete(notif)}>{t('common.delete') || 'Delete'}</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                  </div>
                </CardContent>
              </Card>
              </div>
            </TabsContent>

            {/* Deposit Numbers Tab */}
            <TabsContent value="depositNumbers">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('deposit.numbers') || 'Deposit Numbers'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder={t('deposit.userNumber') || 'Mobile Number'} />
                    <Button onClick={handleAddNumber} disabled={depositNumbers.length >= 10}>{t('common.save') || 'Add'}</Button>
                  </div>
                  {loadingDepositNumbers ? (
                    <div>Loading...</div>
                  ) : (
                    <ul className="space-y-2">
                      {depositNumbers.map((num) => (
                        <li key={num.id} className="flex items-center gap-2">
                          <Input value={num.number} onChange={e => handleUpdateNumber(num.id, e.target.value)} />
                          <Button variant="destructive" onClick={() => handleRemoveNumber(num.id)}>{t('common.delete') || 'Remove'}</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deposit Requests Tab */}
            <TabsContent value="depositRequests">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>{t('deposit.requests') || 'Deposit Requests'}</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDepositRequests ? (
                    <div>Loading...</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('deposit.amount') || 'Amount'}</TableHead>
                          <TableHead>{t('deposit.userNumber') || 'User Number'}</TableHead>
                          <TableHead>{t('deposit.targetNumber') || 'Target Number'}</TableHead>
                          <TableHead>{t('deposit.screenshot') || 'Screenshot'}</TableHead>
                          <TableHead>{t('deposit.status') || 'Status'}</TableHead>
                          <TableHead>{t('deposit.actions') || 'Actions'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depositRequests.map((req) => (
                          <TableRow key={req.id}>
                            <TableCell>{req.amount}</TableCell>
                            <TableCell>{req.user_number}</TableCell>
                            <TableCell>{req.target_number}</TableCell>
                            <TableCell>
                              <a href={req.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                {t('deposit.view') || 'View'}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant={req.status === 'approved' ? 'default' : req.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {req.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {req.status === 'pending' && (
                                <div className="flex space-x-2">
                                  <Button size="sm" className="bg-success" onClick={() => handleApproveDeposit(req)}>
                                    {t('common.save') || 'Approve'}
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => handleRejectDeposit(req.id)}>
                                    {t('common.delete') || 'Reject'}
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Admin Chat Tab */}
            <TabsContent value="adminChat">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    {t('admin.supportChat') || 'Support Chat'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AdminChat />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Referrals Tab */}
            <TabsContent value="referrals">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Referral Settings */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users2 className="h-5 w-5" />
                    {t('admin.referralSettings')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="level1">{t('admin.level1Points')}</Label>
                      <Input
                        id="level1"
                        type="number"
                        value={referralSettings.level1Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level1Points: parseInt(e.target.value) || 0 }))}
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level2">{t('admin.level2Points')}</Label>
                      <Input
                        id="level2"
                        type="number"
                        value={referralSettings.level2Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level2Points: parseInt(e.target.value) || 0 }))}
                        placeholder="50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="level3">{t('admin.level3Points')}</Label>
                      <Input
                        id="level3"
                        type="number"
                        value={referralSettings.level3Points}
                        onChange={(e) => setReferralSettings(prev => ({ ...prev, level3Points: parseInt(e.target.value) || 0 }))}
                        placeholder="25"
                      />
                    </div>
                    <Button onClick={handleUpdateReferralSettings} className="w-full">
                      {t('admin.updateSettings')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Top Referrers */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                    {t('admin.topReferrers')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingReferrers ? (
                      <div className="text-center py-4">{t('admin.loading')}</div>
                    ) : topReferrers.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">{t('admin.noReferrers')}</div>
                    ) : (
                      <div className="space-y-3">
                        {topReferrers.map((referrer, index) => (
                          <div key={referrer.email} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">{referrer.first_name} {referrer.last_name}</p>
                                <p className="text-sm text-muted-foreground">{referrer.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">{referrer.total_referral_points || 0} {t('admin.pts')}</p>
                              <p className="text-sm text-muted-foreground">{referrer.referral_count || 0} {t('admin.referrals')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Referral Statistics */}
              <Card className="shadow-card mt-6">
                <CardHeader>
                  <CardTitle>{t('admin.referralStats')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {topReferrers.reduce((sum, r) => sum + (r.referral_count || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('admin.totalReferrals')}</p>
                      </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {topReferrers.reduce((sum, r) => sum + (r.total_referral_points || 0), 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('admin.totalPointsAwarded')}</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {topReferrers.length}
                      </p>
                      <p className="text-sm text-muted-foreground">{t('admin.activeReferrers')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gamification Tab */}
            <TabsContent value="gamification">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Badges Management */}
                <Card className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      {t('admin.badges') || 'Badges Management'}
                    </CardTitle>
                    <Button onClick={() => setShowBadgeModal(true)} size="sm">
                      {t('admin.createBadge') || 'Create Badge'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingBadges ? (
                      <div className="text-center py-4">{t('admin.loading')}</div>
                    ) : badges.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">{t('admin.noBadges')}</div>
                    ) : (
                      <div className="space-y-3">
                        {badges.map((badge) => (
                          <div key={badge.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                <Award className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{badge.name}</p>
                                <p className="text-sm text-muted-foreground">{badge.description}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {badge.type}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {badge.requirement} req
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {badge.points_awarded} pts
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setSelectedBadge(badge);
                                  setBadgeForm({
                                    name: badge.name,
                                    description: badge.description,
                                    type: badge.type,
                                    requirement: badge.requirement,
                                    points_awarded: badge.points_awarded,
                                    is_active: badge.is_active
                                  });
                                  setShowBadgeModal(true);
                                }}
                              >
                                {t('admin.edit') || 'Edit'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => confirmDelete('badge', badge.id, badge.name)}
                              >
                                {t('admin.delete') || 'Delete'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Levels Management */}
                <Card className="shadow-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      {t('admin.levels') || 'Levels Management'}
                    </CardTitle>
                    <Button onClick={() => setShowLevelModal(true)} size="sm">
                      {t('admin.createLevel') || 'Create Level'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loadingLevels ? (
                      <div className="text-center py-4">{t('admin.loading')}</div>
                    ) : levels.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">{t('admin.noLevels')}</div>
                    ) : (
                      <div className="space-y-3">
                        {levels.map((level) => (
                          <div key={level.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                {level.level}
                              </div>
                              <div>
                                <p className="font-medium">{level.name}</p>
                                <p className="text-sm text-muted-foreground">{level.description}</p>
                                <p className="text-xs text-muted-foreground">{level.requirement} points required</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {level.benefits}
                              </Badge>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedLevel(level);
                                    setLevelForm({
                                      level: level.level,
                                      name: level.name,
                                      description: level.description,
                                      requirement: level.requirement,
                                      benefits: level.benefits
                                    });
                                    setShowLevelModal(true);
                                  }}
                                >
                                  {t('admin.edit') || 'Edit'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => confirmDelete('level', level.id, level.name)}
                                >
                                  {t('admin.delete') || 'Delete'}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Gamification Settings */}
              <Card className="shadow-card mt-6">
                <CardHeader>
                  <CardTitle>{t('admin.gamificationSettings') || 'Gamification Settings'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold">{t('admin.pointsMultiplier') || 'Points Multiplier'}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Deposit</Label>
                          <Input
                            type="number"
                            value={gamificationSettings.points_multiplier?.deposit || 1}
                            onChange={(e) => {
                              const newSettings = { ...gamificationSettings };
                              if (!newSettings.points_multiplier) newSettings.points_multiplier = {};
                              newSettings.points_multiplier.deposit = parseFloat(e.target.value) || 1;
                              setGamificationSettings(newSettings);
                            }}
                            className="w-20"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Referral</Label>
                          <Input
                            type="number"
                            value={gamificationSettings.points_multiplier?.referral || 2}
                            onChange={(e) => {
                              const newSettings = { ...gamificationSettings };
                              if (!newSettings.points_multiplier) newSettings.points_multiplier = {};
                              newSettings.points_multiplier.referral = parseFloat(e.target.value) || 2;
                              setGamificationSettings(newSettings);
                            }}
                            className="w-20"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Withdrawal</Label>
                          <Input
                            type="number"
                            value={gamificationSettings.points_multiplier?.withdrawal || 1.5}
                            onChange={(e) => {
                              const newSettings = { ...gamificationSettings };
                              if (!newSettings.points_multiplier) newSettings.points_multiplier = {};
                              newSettings.points_multiplier.withdrawal = parseFloat(e.target.value) || 1.5;
                              setGamificationSettings(newSettings);
                            }}
                            className="w-20"
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={() => handleUpdateGamificationSettings('points_multiplier', gamificationSettings.points_multiplier)}
                        className="w-full"
                      >
                        {t('admin.updateSettings') || 'Update Settings'}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">{t('admin.automation') || 'Automation Settings'}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Auto Award Badges</Label>
                          <Select
                            value={gamificationSettings.badge_auto_award ? 'true' : 'false'}
                            onValueChange={(value) => {
                              const newSettings = { ...gamificationSettings };
                              newSettings.badge_auto_award = value === 'true';
                              setGamificationSettings(newSettings);
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Enabled</SelectItem>
                              <SelectItem value="false">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label>Auto Update Levels</Label>
                          <Select
                            value={gamificationSettings.level_auto_update ? 'true' : 'false'}
                            onValueChange={(value) => {
                              const newSettings = { ...gamificationSettings };
                              newSettings.level_auto_update = value === 'true';
                              setGamificationSettings(newSettings);
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">Enabled</SelectItem>
                              <SelectItem value="false">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          handleUpdateGamificationSettings('badge_auto_award', gamificationSettings.badge_auto_award);
                          handleUpdateGamificationSettings('level_auto_update', gamificationSettings.level_auto_update);
                        }}
                        className="w-full"
                      >
                        {t('admin.updateSettings') || 'Update Settings'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Badges Statistics */}
              <Card className="shadow-card mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{t('admin.userBadges') || 'User Badges Statistics'}</CardTitle>
                  <Button onClick={() => setShowUserBadgeModal(true)} size="sm">
                    {t('admin.assignBadge') || 'Assign Badge'}
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin.user') || 'User'}</TableHead>
                        <TableHead>{t('admin.badge') || 'Badge'}</TableHead>
                        <TableHead>{t('admin.earnedAt') || 'Earned At'}</TableHead>
                        <TableHead>{t('admin.points') || 'Points'}</TableHead>
                        <TableHead>{t('admin.actions') || 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userBadges.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            {t('admin.noUserBadges') || 'No badges earned yet'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        userBadges.map((userBadge) => (
                          <TableRow key={userBadge.id}>
                            <TableCell>
                              {userBadge.user?.first_name} {userBadge.user?.last_name}
                              <br />
                              <span className="text-sm text-muted-foreground">{userBadge.user?.email}</span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Award className="h-4 w-4 text-primary" />
                                {userBadge.badge?.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(userBadge.earned_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {userBadge.badge?.points_awarded || 0} pts
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedUserBadge(userBadge);
                                    setUserBadgeForm({
                                      user_id: userBadge.user_id,
                                      badge_id: userBadge.badge_id,
                                      points_earned: userBadge.points_earned || 0
                                    });
                                    setShowUserBadgeModal(true);
                                  }}
                                >
                                  {t('admin.edit') || 'Edit'}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => confirmDelete('userBadge', userBadge.id, `${userBadge.user?.first_name} ${userBadge.user?.last_name} - ${userBadge.badge?.name}`)}
                                >
                                  {t('admin.delete') || 'Delete'}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-background p-6 rounded shadow-lg min-w-[300px]">
            <h2 className="text-xl font-bold mb-4">{t('common.userDetails')}</h2>
            <div className="mb-2">{t('common.name')} {selectedUser.first_name} {selectedUser.last_name}</div>
            <div className="mb-2">{t('common.email')} {selectedUser.email}</div>
            <div className="mb-2">{t('common.phone')} {selectedUser.phone}</div>
            <div className="mb-2">{t('common.wallet')} {selectedUser.wallet}</div>
            <div className="mb-2">{t('common.verified')} {selectedUser.verified ? t('common.yes') : t('common.no')}</div>
            <button className="mt-4 px-4 py-2 bg-primary text-white rounded" onClick={() => setShowUserModal(false)}>
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {/* Badge Creation/Edit Modal */}
      <Dialog open={showBadgeModal} onOpenChange={setShowBadgeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {selectedBadge ? t('admin.editBadge') || 'Edit Badge' : t('admin.createBadge') || 'Create Badge'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="badgeName">{t('admin.badgeName') || 'Badge Name'}</Label>
              <Input
                id="badgeName"
                value={badgeForm.name}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter badge name"
              />
            </div>
            <div>
              <Label htmlFor="badgeDescription">{t('admin.badgeDescription') || 'Description'}</Label>
              <Input
                id="badgeDescription"
                value={badgeForm.description}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter badge description"
              />
            </div>
            <div>
              <Label htmlFor="badgeType">{t('admin.badgeType') || 'Type'}</Label>
              <Select value={badgeForm.type} onValueChange={(value) => setBadgeForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="achievement">Achievement</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  <SelectItem value="profile">Profile</SelectItem>
                  <SelectItem value="verification">Verification</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                  <SelectItem value="loyalty">Loyalty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badgeRequirement">{t('admin.badgeRequirement') || 'Requirement'}</Label>
                <Input
                  id="badgeRequirement"
                  type="number"
                  value={badgeForm.requirement}
                  onChange={(e) => setBadgeForm(prev => ({ ...prev, requirement: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="badgePoints">{t('admin.badgePoints') || 'Points Awarded'}</Label>
                <Input
                  id="badgePoints"
                  type="number"
                  value={badgeForm.points_awarded}
                  onChange={(e) => setBadgeForm(prev => ({ ...prev, points_awarded: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="badgeActive"
                checked={badgeForm.is_active}
                onChange={(e) => setBadgeForm(prev => ({ ...prev, is_active: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="badgeActive">{t('admin.badgeActive') || 'Active'}</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateBadge} className="flex-1">
                {selectedBadge ? t('admin.update') || 'Update' : t('admin.create') || 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowBadgeModal(false)} className="flex-1">
                {t('admin.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Level Creation/Edit Modal */}
      <Dialog open={showLevelModal} onOpenChange={setShowLevelModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              {selectedLevel ? t('admin.editLevel') || 'Edit Level' : t('admin.createLevel') || 'Create Level'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="levelNumber">{t('admin.levelNumber') || 'Level Number'}</Label>
                <Input
                  id="levelNumber"
                  type="number"
                  value={levelForm.level}
                  onChange={(e) => setLevelForm(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  placeholder="1"
                />
              </div>
              <div>
                <Label htmlFor="levelRequirement">{t('admin.levelRequirement') || 'Points Required'}</Label>
                <Input
                  id="levelRequirement"
                  type="number"
                  value={levelForm.requirement}
                  onChange={(e) => setLevelForm(prev => ({ ...prev, requirement: parseInt(e.target.value) || 100 }))}
                  placeholder="100"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="levelName">{t('admin.levelName') || 'Level Name'}</Label>
              <Input
                id="levelName"
                value={levelForm.name}
                onChange={(e) => setLevelForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter level name"
              />
            </div>
            <div>
              <Label htmlFor="levelDescription">{t('admin.levelDescription') || 'Description'}</Label>
              <Input
                id="levelDescription"
                value={levelForm.description}
                onChange={(e) => setLevelForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter level description"
              />
            </div>
            <div>
              <Label htmlFor="levelBenefits">{t('admin.levelBenefits') || 'Benefits'}</Label>
              <Input
                id="levelBenefits"
                value={levelForm.benefits}
                onChange={(e) => setLevelForm(prev => ({ ...prev, benefits: e.target.value }))}
                placeholder="Enter level benefits"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateLevel} className="flex-1">
                {selectedLevel ? t('admin.update') || 'Update' : t('admin.create') || 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setShowLevelModal(false)} className="flex-1">
                {t('admin.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Badge Assignment Modal */}
      <Dialog open={showUserBadgeModal} onOpenChange={setShowUserBadgeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {selectedUserBadge ? t('admin.editUserBadge') || 'Edit User Badge' : t('admin.assignBadge') || 'Assign Badge'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="userBadgeUser">{t('admin.user') || 'User'}</Label>
              <Select value={userBadgeForm.user_id} onValueChange={(value) => setUserBadgeForm(prev => ({ ...prev, user_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_uid} value={user.user_uid}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userBadgeBadge">{t('admin.badge') || 'Badge'}</Label>
              <Select value={userBadgeForm.badge_id} onValueChange={(value) => setUserBadgeForm(prev => ({ ...prev, badge_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select badge" />
                </SelectTrigger>
                <SelectContent>
                  {badges.map((badge) => (
                    <SelectItem key={badge.id} value={badge.id}>
                      {badge.name} ({badge.points_awarded} pts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userBadgePoints">{t('admin.pointsEarned') || 'Points Earned'}</Label>
              <Input
                id="userBadgePoints"
                type="number"
                value={userBadgeForm.points_earned}
                onChange={(e) => setUserBadgeForm(prev => ({ ...prev, points_earned: parseInt(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateUserBadge} className="flex-1">
                {selectedUserBadge ? t('admin.update') || 'Update' : t('admin.assign') || 'Assign'}
              </Button>
              <Button variant="outline" onClick={() => setShowUserBadgeModal(false)} className="flex-1">
                {t('admin.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('admin.confirmDelete') || 'Confirm Delete'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('admin.deleteWarning') || 'Are you sure you want to delete'} <strong>{deleteItem.name}</strong>? 
              {t('admin.deleteWarning2') || 'This action cannot be undone.'}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleGamificationDelete} variant="destructive" className="flex-1">
                {t('admin.delete') || 'Delete'}
              </Button>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                {t('admin.cancel') || 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('admin.export.title')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="exportType">{t('admin.export.type')}</Label>
              <div className="mt-2 p-3 bg-muted rounded-lg">
                <p className="font-medium">{exportType}</p>
              </div>
            </div>
            <div>
              <Label htmlFor="exportFormat">{t('admin.export.format')}</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('admin.export.selectFormat')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={() => performExport(exportType, exportFormat)}
                disabled={exporting}
                className="min-w-[100px]"
              >
                {exporting ? t('admin.export.exporting') : t('admin.export.export')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
