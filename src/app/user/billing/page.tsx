"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { CreditCard, Receipt, Coins, Loader2, Plus, CheckCircle2, Edit2, Trash2 } from 'lucide-react';
import { request } from '@/lib/utils/request';
import { formatDate } from '@/lib/utils/date';
import EditCardModal from '@/components/user/billing/edit_card_modal';
import ReceiptPdfDownloader from '@/components/user/billing/receipt_pdf_downloader';

type Tab = 'orders' | 'points' | 'cards';

interface IOrder {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  type?: string;
  cardInfo?: {
    type_name?: string;
    bin_code?: string;
    last_four?: string;
  } | null;
  buyerName?: string;
  buyerTaxId?: string;
  buyerAddress?: string;
  items?: { name: string; quantity: number | string; unitPrice: number | string; amount: number | string; remark?: string }[];
}

interface IPointHistory {
  id: string;
  createdAt: string;
  sourceKey: string;
  fallbackSource: string;
  amount: number;
}

interface IPaymentMethod {
  id: string;
  provider: string;
  token: string;
  isDefault: boolean;
  createdAt: string;
  data?: {
    name?: string;
    email?: string;
    taxId?: string;
    buyerName?: string;
    billingAddress?: string;
    [key: string]: unknown;
  };
}

interface IPaymentTransaction {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
  items?: { name: string; quantity: number; unitPrice: number; amount: number; remark?: string }[];
}

export default function BillingPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [orders, setOrders] = useState<IOrder[]>([]);

  const [loadingPoints, setLoadingPoints] = useState(true);
  const [pointHistory, setPointHistory] = useState<IPointHistory[]>([]);

  const [loadingCards, setLoadingCards] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);

  const [isBinding, setIsBinding] = useState(false);

  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardData, setEditingCardData] = useState({
    name: '',
    email: '',
    taxId: '',
    buyerName: '',
    billingAddress: ''
  });

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const [cardTransactions, setCardTransactions] = useState<IPaymentTransaction[]>([]);

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab: Tab) => {
    if (tab === 'orders') {
      setLoadingOrders(true);
      try {
        const res = await request<{ payload: { orders: IOrder[] } }>('/api/v1/user/order?type=PAYMENT');
        if (res?.payload) {
          setOrders(res.payload.orders);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingOrders(false);
      }
    } else if (tab === 'points') {
      setLoadingPoints(true);
      try {
        const res = await request<{ payload: { pointHistory: IPointHistory[] } }>('/api/v1/user/point_history');
        if (res?.payload) {
          setPointHistory(res.payload.pointHistory);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPoints(false);
      }
    } else if (tab === 'cards') {
      setLoadingCards(true);
      try {
        const res = await request<{ payload: { paymentMethods: IPaymentMethod[] } }>('/api/v1/user/payment_method');
        if (res?.payload) {
          setPaymentMethods(res.payload.paymentMethods);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingCards(false);
      }
    }
  };

  const handleBindCard = async () => {
    setIsBinding(true);
    try {
      const res = await request<{ payload: { requireBinding: boolean, redirectUrl: string } }>('/api/v1/user/payment_method', {
        method: 'POST'
      });
      if (res?.payload?.redirectUrl) {
        window.location.href = res.payload.redirectUrl;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBinding(false);
    }
  };

  const handleSaveCardDetails = async (id: string, newDetails: typeof editingCardData) => {
    try {
      const res = await request<{ payload: { success: boolean } }>(`/api/v1/user/payment_method/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(newDetails)
      });
      if (res?.payload?.success) {
        setPaymentMethods(prev => prev.map(p => p.id === id ? { ...p, data: { ...p.data, ...newDetails } } : p));
        setEditingCardId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(t('billing.cards.delete_confirm_desc'))) return;
    try {
      const res = await request<{ payload: { success: boolean } }>(`/api/v1/user/payment_method/${id}`, {
        method: 'DELETE'
      });
      if (res?.payload?.success) {
        setPaymentMethods(prev => prev.filter(p => p.id !== id));
        if (expandedCardId === id) setExpandedCardId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleExpandCard = async (id: string) => {
    if (expandedCardId === id) {
      setExpandedCardId(null);
      return;
    }
    setExpandedCardId(id);
    setLoadingTransactions(true);
    setCardTransactions([]);
    try {
      const res = await request<{ payload: { transactions: IPaymentTransaction[] } }>(`/api/v1/user/payment_method/${id}/transactions`);
      if (res?.payload?.transactions) {
        setCardTransactions(res.payload.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTransactions(false);
    }
  };
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.billing')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('billing.subtitle')}
        </p>
      </div>

      {/* Info: (20260409 - Luphia) Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl mb-8 w-full max-w-xl mx-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'orders'
            ? 'bg-white text-orange-600 shadow-sm border border-gray-200/50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
        >
          <Receipt className="w-4 h-4" />
          {t('billing.tabs.orders')}
        </button>
        <button
          onClick={() => setActiveTab('points')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'points'
            ? 'bg-white text-orange-600 shadow-sm border border-gray-200/50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
        >
          <Coins className="w-4 h-4" />
          {t('billing.tabs.points')}
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'cards'
            ? 'bg-white text-orange-600 shadow-sm border border-gray-200/50'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
        >
          <CreditCard className="w-4 h-4" />
          {t('billing.tabs.cards')}
        </button>
      </div>

      {/* Info: (20260409 - Luphia) Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
        {activeTab === 'orders' && (
          <div className="p-0">
            {loadingOrders ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Receipt className="w-12 h-12 text-gray-200 mb-3" />
                <p>{t('billing.orders.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t('billing.table.date')}</th>
                      <th className="px-6 py-4 font-medium">{t('billing.table.order_id')}</th>
                      <th className="px-6 py-4 font-medium">{t('billing.table.amount')}</th>
                      <th className="px-6 py-4 font-medium">{t('billing.table.status')}</th>
                      <th className="px-6 py-4 font-medium w-16"><span className="sr-only">Action</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(order.createdAt, 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-mono text-xs text-gray-900 mb-1">
                            {order.id}
                          </div>
                          {order.type === 'OEN_PAYMENT' || order.type === 'PAYMENT' ? (
                            <div className="text-xs text-gray-500">
                              {t('billing.point_history.source_purchase')}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              {t('billing.point_history.source_analysis', { defaultValue: '服務消費' })}
                            </div>
                          )}
                          {order.cardInfo && (
                            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              {order.cardInfo.type_name} ••••{order.cardInfo.last_four}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          NT$ {order.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${order.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                            order.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 flex justify-end">
                          {(order.type === 'OEN_PAYMENT' || order.type === 'PAYMENT') && order.status === 'SUCCESS' && (
                            <ReceiptPdfDownloader
                              receiptNumber={order.id}
                              date={order.createdAt}
                              amount={order.amount}
                              buyerName={order.buyerName}
                              buyerTaxId={order.buyerTaxId}
                              buyerAddress={order.buyerAddress}
                              items={order.items}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'points' && (
          <div className="p-0">
            {loadingPoints ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : pointHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Coins className="w-12 h-12 text-gray-200 mb-3" />
                <p>{t('billing.points.empty')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t('billing.table.date')}</th>
                      <th className="px-6 py-4 font-medium">{t('billing.table.source')}</th>
                      <th className="px-6 py-4 font-medium text-right">{t('billing.table.amount_change')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pointHistory.map((pt) => {
                      const isPositive = pt.amount > 0;
                      return (
                        <tr key={pt.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-gray-600">
                            {formatDate(pt.createdAt, 'yyyy-MM-dd HH:mm')}
                          </td>
                          <td className="px-6 py-4 text-gray-900">
                            {t(pt.sourceKey)}
                          </td>
                          <td className={`px-6 py-4 font-bold text-right ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
                            {isPositive ? '+' : ''}{pt.amount}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cards' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {t('billing.cards.title')}
              </h2>
              <button
                onClick={handleBindCard}
                disabled={isBinding}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm disabled:opacity-50"
              >
                {isBinding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('billing.cards.add_button')}
              </button>
            </div>

            {loadingCards ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="bg-gray-50/50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  {t('billing.cards.empty')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {paymentMethods.map((pm, index) => (
                  <div key={pm.id} className="flex flex-col bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/50 hover:shadow-md transition-all duration-300 overflow-hidden">
                    {/* Info: (20260409 - Luphia) Main Card Header */}
                    <div
                      className="p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpandCard(pm.id)}
                      role="button"
                      aria-label="Toggle card details"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleExpandCard(pm.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-orange-600 shadow-sm">
                          <span className="text-white text-sm font-bold tracking-wider italic">{pm.provider}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-lg">
                              {pm.data?.name || String(index + 1).padStart(3, '0')}
                            </span>
                            {pm.isDefault && (
                              <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                {t('billing.cards.default_card')}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1 font-mono">
                            •••• •••• •••• {pm.token && pm.token.length >= 4 ? pm.token.substring(pm.token.length - 4) : '****'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 hidden sm:inline-block">
                          {t('billing.cards.added_at')} {formatDate(pm.createdAt, 'yyyy/MM/dd')}
                        </span>

                        <div className="flex items-center gap-1 ml-4">
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCardId(pm.id);
                                setEditingCardData({
                                  name: pm.data?.name || String(index + 1).padStart(3, '0'),
                                  email: pm.data?.email || '',
                                  taxId: pm.data?.taxId || '',
                                  buyerName: pm.data?.buyerName || '',
                                  billingAddress: pm.data?.billingAddress || ''
                                });
                              }}
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                              title={t('billing.cards.edit_details', { defaultValue: 'Edit Details' })}
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteCard(pm.id); }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title={t('billing.cards.delete', { defaultValue: 'Delete' })}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        </div>
                      </div>
                    </div>

                    {/* Info: (20260409 - Luphia) Accordion Content */}
                    {expandedCardId === pm.id && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-2">
                        {loadingTransactions ? (
                          <div className="flex justify-center items-center h-24">
                            <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                          </div>
                        ) : cardTransactions.length === 0 ? (
                          <div className="flex flex-col justify-center items-center h-24 text-gray-500 text-sm">
                            {t('billing.orders.empty')}
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="text-gray-500 bg-transparent">
                                <tr>
                                  <th className="px-6 py-4 font-medium">{t('billing.table.date')}</th>
                                  <th className="px-6 py-4 font-medium">{t('billing.table.amount')}</th>
                                  <th className="px-6 py-4 font-medium">{t('billing.table.status')}</th>
                                  <th className="px-6 py-4 font-medium w-16"><span className="sr-only">Action</span></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {cardTransactions.map(tx => (
                                  <tr key={tx.id} className="hover:bg-white transition-colors">
                                    <td className="px-6 py-4 text-gray-600">
                                      {formatDate(tx.createdAt, 'yyyy-MM-dd HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                      NT$ {tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${tx.status === 'SUCCESS' ? 'bg-green-50 text-green-700' :
                                        tx.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                                          'bg-red-50 text-red-700'
                                        }`}>
                                        {tx.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3 flex justify-end">
                                      {tx.status === 'SUCCESS' && (
                                        <ReceiptPdfDownloader
                                          receiptNumber={tx.id}
                                          date={tx.createdAt}
                                          amount={tx.amount}
                                          buyerName={pm.data?.buyerName}
                                          buyerTaxId={pm.data?.taxId}
                                          buyerAddress={pm.data?.billingAddress}
                                          items={tx.items}
                                        />
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info: (20260409 - Luphia) Edit Card Modal */}
      {editingCardId && (
        <EditCardModal
          isOpen={!!editingCardId}
          onClose={() => setEditingCardId(null)}
          onSave={async (data) => {
            await handleSaveCardDetails(editingCardId, data);
          }}
          initialData={{
            name: editingCardData.name,
            email: editingCardData.email,
            taxId: editingCardData.taxId,
            buyerName: editingCardData.buyerName,
            billingAddress: editingCardData.billingAddress
          }}
        />
      )}
    </div>
  );
}
