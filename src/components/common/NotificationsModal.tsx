import React from 'react';
import { useApp } from '../../context/AppContext';
import { NotificationItem } from '../../types';
import {
  Bell,
  X,
  Trash2,
  Calendar,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'booking':
      case 'cancellation':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'payment':
      case 'subscription':
        return <CreditCard className="w-5 h-5 text-emerald-600" />;
      case 'expiry':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'system':
      default:
        return <Bell className="w-5 h-5 text-purple-600" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markNotificationRead(item.id);
    if (onNavigate) {
      if (item.type === 'payment' || item.type === 'subscription') {
        onNavigate('payments');
        onClose();
      } else if (item.type === 'booking' || item.type === 'cancellation') {
        onNavigate('sessions');
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-slate-100 overflow-hidden">
        {/* Simple Native-App Style Header */}
        <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">Updates, bookings & billing</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Mark Read Sub-bar if unread exist */}
        {unreadCount > 0 && (
          <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <span>You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}</span>
            <button
              onClick={markAllNotificationsRead}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          </div>
        )}

        {/* Notifications List - clean, uncluttered, each card fully visible */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-14 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Bell className="w-7 h-7" />
              </div>
              <div className="font-bold text-slate-800 text-sm">All Caught Up!</div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                No active notifications right now. New bookings, payment alerts, and schedule changes will appear here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  !n.read
                    ? 'bg-blue-50/60 border-blue-200 shadow-2xs'
                    : 'bg-white border-slate-200/80 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-bold text-xs ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{n.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Clear / Delete button & Read action */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {!n.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(n.id);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Clear this notification"
                      aria-label="Clear notification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Clean Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
