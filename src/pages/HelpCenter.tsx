import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  HelpCircle, 
  DollarSign, 
  Users, 
  Package, 
  MessageCircle,
  CheckCircle,
  ArrowRight,
  Info,
  AlertTriangle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase, checkIfUserIsAdmin } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function HelpCenter() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [showAlert, setShowAlert] = useState(false);

  // Data-driven support options
  const supportOptions = [
    {
      label: t('help.liveChat'),
      variant: 'secondary',
      onClick: () => {
        // Dispatch a custom event to open the chat
        window.dispatchEvent(new CustomEvent('open-chat'));
      },
    },
  ];

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

  const helpSections = [
    {
      icon: DollarSign,
      title: t('help.deposit.title'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      steps: [
        t('help.deposit.step1'),
        t('help.deposit.step2'),
        t('help.deposit.step3'),
        t('help.deposit.step4'),
        t('help.deposit.step5'),
      ]
    },
    {
      icon: DollarSign,
      title: t('help.withdrawal.title'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      steps: [
        t('help.withdrawal.step1'),
        t('help.withdrawal.step2'),
        t('help.withdrawal.step3'),
        t('help.withdrawal.step4'),
        t('help.withdrawal.step5'),
      ]
    },
    {
      icon: Users,
      title: t('help.invite.title'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      steps: [
        t('help.invite.step1'),
        t('help.invite.step2'),
        t('help.invite.step3'),
        t('help.invite.step4'),
        t('help.invite.step5'),
      ]
    },
    {
      icon: Package,
      title: t('help.packages.title'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      steps: [
        t('help.packages.step1'),
        t('help.packages.step2'),
        t('help.packages.step3'),
        t('help.packages.step4'),
        t('help.packages.step5'),
      ]
    }
  ];

  const faqs = [
    {
      question: t('help.faq.q1'),
      answer: t('help.faq.a1')
    },
    {
      question: t('help.faq.q2'),
      answer: t('help.faq.a2')
    },
    {
      question: t('help.faq.q3'),
      answer: t('help.faq.a3')
    },
    {
      question: t('help.faq.q4'),
      answer: t('help.faq.a4')
    },
    {
      question: t('help.faq.q5'),
      answer: t('help.faq.a5')
    },
    {
      question: t('help.faq.q6'),
      answer: t('help.faq.a6')
    }
  ];

  return (
    <div className="min-h-screen py-20">
      {/* Alert for incomplete account information */}
      {showAlert && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              {t('common.completeProfile') || 'Please complete your account information to access help center. Redirecting to profile setup...'}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 gradient-primary rounded-full flex items-center justify-center">
                <HelpCircle className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              {t('help.title')}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('help.subtitle')}
            </p>
          </div>

          {/* Help Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {helpSections.map((section, index) => (
              <Card key={index} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${section.bgColor} rounded-lg flex items-center justify-center`}>
                      <section.icon className={`w-6 h-6 ${section.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                          {stepIndex + 1}
                        </div>
                        <p className="text-muted-foreground leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{t('help.faq.title')}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-border pb-6 last:border-b-0">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        Q
                      </div>
                      <h3 className="font-semibold text-lg">{faq.question}</h3>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        A
                      </div>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-8 gradient-card shadow-glow">
            <CardContent className="pt-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-primary">
                  {t('help.needMoreHelp')}
                </h3>
                <p className="text-foreground mb-6">
                  {t('help.supportMessage')}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {supportOptions.map((option, idx) => (
                    <Button
                      key={option.label}
                      variant={option.variant as any}
                      size="lg"
                      className={`px-6 py-2 text-base font-bold transition-all duration-150
                        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                        hover:scale-105 hover:shadow-lg active:scale-95
                        ${option.variant === 'default'
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/60'}
                      `}
                      onClick={option.onClick}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 