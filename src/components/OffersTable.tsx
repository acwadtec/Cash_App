import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

interface Offer {
  id: string;
  title?: string;
  description?: string;
  amount: number;
  cost: number;
  daily_profit: number;
  monthly_profit: number;
  image_url?: string;
  type?: string;
  deadline?: string;
  active?: boolean;
  title_en?: string;
  title_ar?: string;
  description_en?: string;
  description_ar?: string;
}

interface OffersTableProps {
  offers: Offer[];
  onEdit?: (offer: Offer) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  renderExtra?: (offer: Offer) => React.ReactNode;
}

const OffersTable: React.FC<OffersTableProps> = ({ offers, onEdit, onDelete, showActions = true, renderExtra }) => {
  const { t, language, isRTL } = useLanguage();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            {renderExtra && <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('common.active')}</th>}
            {showActions && <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('common.actions')}</th>}
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.image')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.title')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.description')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.amount')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.cost')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.dailyProfit')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.monthlyProfit')}</th>
            <th className="text-left px-4 py-2 text-gray-900 dark:text-gray-100 font-medium">{t('offers.deadline')}</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {renderExtra && <td className="text-left px-4 py-2">{renderExtra(offer)}</td>}
              {showActions && (
                <td className="text-left px-4 py-2">
                  {onEdit && <Button size="sm" variant="outline" onClick={() => onEdit(offer)} className="mr-2">{t('common.edit')}</Button>}
                  {onDelete && <Button size="sm" variant="destructive" onClick={() => onDelete(offer.id)}>{t('common.delete')}</Button>}
                </td>
              )}
              <td className="text-left px-4 py-2">
                <img
                  src={offer.image_url || '/placeholder.svg'}
                  alt={language === 'ar' ? (offer.title_ar || offer.title_en) : (offer.title_en || offer.title_ar)}
                  className="w-12 h-12 object-contain rounded-md bg-white p-1 border"
                  onError={e => e.currentTarget.src = '/placeholder.svg'}
                />
              </td>
              <td className="text-left px-4 py-2 font-medium text-gray-900 dark:text-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
                {language === 'ar' ? (offer.title_ar || offer.title_en) : (offer.title_en || offer.title_ar)}
              </td>
              <td className="text-left px-4 py-2 max-w-xs truncate text-gray-700 dark:text-gray-300" title={language === 'ar' ? (offer.description_ar || offer.description_en) : (offer.description_en || offer.description_ar)} dir={isRTL ? 'rtl' : 'ltr'}>
                {language === 'ar' ? (offer.description_ar || offer.description_en) : (offer.description_en || offer.description_ar)}
              </td>
              <td className="text-left px-4 py-2">
                <Badge variant="secondary">{offer.amount.toLocaleString()} EGP</Badge>
              </td>
              <td className="text-left px-4 py-2">
                {offer.cost ? (
                  <span className="text-gray-600 dark:text-gray-300">{offer.cost.toLocaleString()} EGP</span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                )}
              </td>
              <td className="text-left px-4 py-2">
                {offer.daily_profit ? (
                  <Badge variant="outline" className="text-green-600 border-green-600 dark:text-green-400 dark:border-green-400">
                    {offer.daily_profit.toLocaleString()} EGP
                  </Badge>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                )}
              </td>
              <td className="text-left px-4 py-2">
                {offer.monthly_profit ? (
                  <Badge variant="outline" className="text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400">
                    {offer.monthly_profit.toLocaleString()} EGP
                  </Badge>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                )}
              </td>
              <td className="text-left px-4 py-2">
                {offer.deadline ? (
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {new Date(offer.deadline).toLocaleDateString()}
                  </span>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">No deadline</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OffersTable; 