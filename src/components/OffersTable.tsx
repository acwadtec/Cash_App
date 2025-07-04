import React from 'react';
import { Button } from '@/components/ui/button';

interface Offer {
  id: string;
  title: string;
  description: string;
  amount: number;
  type?: string;
  deadline?: string;
}

interface OffersTableProps {
  offers: Offer[];
  onEdit?: (offer: Offer) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  renderExtra?: (offer: Offer) => React.ReactNode;
}

const OffersTable: React.FC<OffersTableProps> = ({ offers, onEdit, onDelete, showActions = true, renderExtra }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          {renderExtra && <th className="text-left px-4 py-2">Active</th>}
          {showActions && <th className="text-left px-4 py-2">Actions</th>}
          <th className="text-left px-4 py-2">Title</th>
          <th className="text-left px-4 py-2">Description</th>
          <th className="text-left px-4 py-2">Amount</th>
          <th className="text-left px-4 py-2">Deadline</th>
        </tr>
      </thead>
      <tbody>
        {offers.map((offer) => (
          <tr key={offer.id}>
            {renderExtra && <td className="text-left px-4 py-2">{renderExtra(offer)}</td>}
            {showActions && (
              <td className="text-left px-4 py-2">
                {onEdit && <Button size="sm" variant="outline" onClick={() => onEdit(offer)} className="mr-2">Edit</Button>}
                {onDelete && <Button size="sm" variant="destructive" onClick={() => onDelete(offer.id)}>Delete</Button>}
              </td>
            )}
            <td className="text-left px-4 py-2">{offer.title}</td>
            <td className="text-left px-4 py-2">{offer.description}</td>
            <td className="text-left px-4 py-2">{offer.amount}</td>
            <td className="text-left px-4 py-2">{offer.deadline ? new Date(offer.deadline).toLocaleDateString() : "No deadline"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default OffersTable; 