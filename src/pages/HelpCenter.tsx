import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  HelpCircle, 
  DollarSign, 
  Users, 
  Package, 
  MessageCircle,
  ArrowRight,
  CheckCircle,
  FileText,
  Share2,
  Gift
} from 'lucide-react';

export default function HelpCenter() {
  const { t } = useLanguage();

  const helpSections = [
    {
      id: 'deposit',
      title: t('help.howToDeposit'),
      icon: DollarSign,
      steps: [
        t('help.deposit.step1'),
        t('help.deposit.step2'),
        t('help.deposit.step3'),
        t('help.deposit.step4'),
      ],
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'withdraw',
      title: t('help.howToWithdraw'),
      icon: FileText,
      steps: [
        t('help.withdraw.step1'),
        t('help.withdraw.step2'),
        t('help.withdraw.step3'),
        t('help.withdraw.step4'),
      ],
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'invite',
      title: t('help.howToInvite'),
      icon: Share2,
      steps: [
        t('help.invite.step1'),
        t('help.invite.step2'),
        t('help.invite.step3'),
        t('help.invite.step4'),
      ],
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      id: 'packages',
      title: t('help.howPackagesWork'),
      icon: Package,
      steps: [
        t('help.packages.step1'),
        t('help.packages.step2'),
        t('help.packages.step3'),
        t('help.packages.step4'),
      ],
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  const faqItems = [
    {
      question: t('help.faq.question1'),
      answer: t('help.faq.answer1'),
    },
    {
      question: t('help.faq.question2'),
      answer: t('help.faq.answer2'),
    },
    {
      question: t('help.faq.question3'),
      answer: t('help.faq.answer3'),
    },
    {
      question: t('help.faq.question4'),
      answer: t('help.faq.answer4'),
    },
    {
      question: t('help.faq.question5'),
      answer: t('help.faq.answer5'),
    },
    {
      question: t('help.faq.question6'),
      answer: t('help.faq.answer6'),
    },
  ];

  return (
    <div className="min-h-screen py-20">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
            {helpSections.map((section, index) => (
              <Card key={section.id} className="shadow-card hover:shadow-glow transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${section.bgColor} ${section.borderColor} border-2 rounded-lg flex items-center justify-center`}>
                      <section.icon className={`w-6 h-6 ${section.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                      <Badge variant="secondary" className="mt-2">
                        {index + 1} {index === 0 ? 'Guide' : 'Guides'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {section.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3">
                        <div className={`w-8 h-8 ${section.bgColor} ${section.borderColor} border rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <span className={`text-sm font-bold ${section.color}`}>
                            {stepIndex + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">
                            {t(`help.step${stepIndex + 1}`)}
                          </p>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {step}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="shadow-card">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 gradient-primary rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <CardTitle className="text-3xl">{t('help.faq')}</CardTitle>
              <p className="text-muted-foreground">
                Find answers to the most common questions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {faqItems.map((item, index) => (
                  <div key={index} className="p-6 rounded-lg bg-accent/20 border border-border hover:border-primary/20 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2 text-foreground">
                          {item.question}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contact Support */}
          <Card className="mt-8 gradient-card shadow-glow">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Gift className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-primary-foreground">
                Need More Help?
              </h3>
              <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
                Our support team is available 24/7 to help you with any questions or issues you may have.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Live Chat
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Email Support
                </Badge>
                <Badge variant="secondary" className="px-4 py-2 text-sm">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Knowledge Base
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 