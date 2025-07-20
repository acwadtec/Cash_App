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
    <div className="min-h-screen py-20 bg-gradient-to-br from-background via-background to-muted/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
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

      <div className="container mx-auto px-4 relative">
        <div className="max-w-6xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12 md:mb-16">
            <div className="flex justify-center mb-6 md:mb-8">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              {t('help.title')}
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto px-4 leading-relaxed">
              {t('help.subtitle')}
            </p>
          </div>

          {/* Enhanced Help Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 mb-12 md:mb-16">
            {helpSections.map((section, index) => (
              <Card key={index} className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden group hover:scale-105 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="relative">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1 group-hover:scale-110 transition-transform duration-300">
                      <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                        <section.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {section.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-6">
                    {section.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-4">
                        <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5 group-hover:scale-110 transition-transform duration-300">
                          {stepIndex + 1}
                        </div>
                        <p className="text-muted-foreground leading-relaxed text-lg">{step}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enhanced FAQ Section */}
          <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden mb-12">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 p-1">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <MessageCircle className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    {t('help.faq.title')}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-8">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-primary/10 pb-8 last:border-b-0">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        Q
                      </div>
                      <h3 className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        {faq.question}
                      </h3>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                        A
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-lg">{faq.answer}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Contact Support */}
          <Card className="shadow-2xl bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5"></div>
            <CardContent className="pt-12 pb-12 relative text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-primary to-purple-600 p-1">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                  <Info className="w-10 h-10 text-primary" />
                </div>
              </div>
              <h3 className="text-3xl font-bold mb-6 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                {t('help.needMoreHelp')}
              </h3>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                {t('help.supportMessage')}
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                {supportOptions.map((option, idx) => (
                  <Button
                    key={option.label}
                    variant={option.variant as any}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-purple-600 border-0 text-white hover:scale-105 transition-all duration-300 shadow-2xl px-8 py-4 text-lg font-bold"
                    onClick={option.onClick}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 