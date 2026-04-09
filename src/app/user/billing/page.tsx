"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/i18n_context';
import { CreditCard, Receipt, Coins, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { request } from '@/lib/utils/request';
import { formatDate } from '@/lib/utils/date';

type Tab = 'orders' | 'points' | 'cards';

interface IOrder {
  id: string;
  createdAt: string;
  amount: number;
  status: string;
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

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('sidebar.billing')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('billing.subtitle')}
        </p>
      </div>

      {/* Info: (20260409 - Luphia) Tabs */}
      <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-xl mb-8 w-full max-w-xl">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-gray-600">
                          {formatDate(order.createdAt, 'yyyy-MM-dd HH:mm')}
                        </td>
                        <td className="px-6 py-4 text-gray-900 font-mono text-xs">
                          {order.id}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map((pm) => (
                  <div key={pm.id} className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-white shadow-md border border-slate-700">
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-5"></div>
                    <div className="flex justify-between items-start mb-8 relative z-10">
                      <div className="text-xl font-bold italic opacity-80 tracking-widest">{pm.provider}</div>
                      {pm.isDefault && (
                        <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('billing.cards.default_card')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-4 relative z-10">
                      <div className="text-sm text-gray-400">Card Token</div>
                      <div className="font-mono text-lg tracking-widest truncate" title={pm.token}>
                        •••• •••• •••• {pm.token.substring(pm.token.length - 4)}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-between items-center text-xs text-gray-400 relative z-10">
                      <span>{t('billing.cards.added_at')} {formatDate(pm.createdAt, 'yyyy/MM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
