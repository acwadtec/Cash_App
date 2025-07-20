// Update this page (the content is just a fallback if you fail to update the page)
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const { t } = useLanguage();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t('home.title')}</h1>
        <p className="text-xl text-muted-foreground">{t('home.subtitle')}</p>
      </div>
    </div>
  );
};

export default Index;
