import { useLanguage } from '@/contexts/LanguageContext';

export default function ReadMore() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold mb-6 text-primary text-center">
        {t('readmore.title')}
      </h1>
      <p className="text-lg max-w-2xl text-center text-muted-foreground">
        {t('readmore.body')}
      </p>
    </div>
  );
} 