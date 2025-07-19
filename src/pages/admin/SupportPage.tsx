import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminChat } from '@/components/AdminChat';

export default function SupportPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-4 p-8">
      <Card className="shadow-card w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 mr-2" />
            {t('admin.supportChat')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminChat />
        </CardContent>
      </Card>
    </div>
  );
} 