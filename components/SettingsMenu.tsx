import React from 'react';
import { HistoryIcon, UserIcon, StarIcon, LinkIcon, SunIcon, CreditCardIcon, SparklesIcon, MessageIcon, QuestionMarkCircleIcon, ChevronRightIcon, KeyIcon } from './IconComponents';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  setTheme: (theme: string) => void;
  onClearHistory: () => void;
  onOpenModal: (modal: string) => void;
  locationInfo: { name: string; source: string };
  isLocating: boolean;
  onUpdateLocation: () => void;
}

const SettingsMenuItem: React.FC<{ icon: React.ReactNode; label: string; hasArrow?: boolean; hasDot?: boolean; onClick?: () => void; extraText?: string }> = ({ icon, label, hasArrow, hasDot, onClick, extraText }) => (
  <button onClick={onClick} className="w-full text-left flex items-center space-x-4 px-4 py-3 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">
    <div className="w-5 h-5 text-gray-400">{icon}</div>
    <span className="flex-1 text-sm">{label}</span>
    {extraText && <span className="text-sm text-gray-400">{extraText}</span>}
    {hasDot && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
    {hasArrow && !extraText && <ChevronRightIcon className="w-5 h-5 text-gray-500" />}
  </button>
);

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, theme, setTheme, onClearHistory, onOpenModal, locationInfo, isLocating, onUpdateLocation }) => {
  if (!isOpen) return null;

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
        onClick={onClose}
    >
        <div 
            className="glass-panel w-80 rounded-2xl p-2 text-white animate-scale-in"
            onClick={(e) => e.stopPropagation()}
        >
            <style>{`.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; } @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
            
            <SettingsMenuItem icon={<HistoryIcon />} label="Очистить историю" onClick={onClearHistory} />
            <SettingsMenuItem icon={<UserIcon />} label="Персональный контекст" hasDot onClick={() => onOpenModal('updateUser')} />
            <SettingsMenuItem icon={<StarIcon />} label="Подключенные приложения" onClick={() => onOpenModal('info-connectedApps')} />
            <SettingsMenuItem icon={<HistoryIcon />} label="Запланированные действия" onClick={() => onOpenModal('info-scheduled')} />
            <SettingsMenuItem icon={<LinkIcon />} label="Ваши ссылки" onClick={() => onOpenModal('info-links')} />

            <div className="border-t border-white border-opacity-10 my-2"></div>

            <SettingsMenuItem icon={<KeyIcon />} label="API-ключ" onClick={() => onOpenModal('apiKey')} />
            <SettingsMenuItem icon={<KeyIcon />} label="Горячие клавиши" onClick={() => onOpenModal('hotkeys')} hasArrow />
            <SettingsMenuItem icon={<SunIcon />} label="Тема" onClick={toggleTheme} extraText={theme === 'dark' ? 'Темная' : 'Светлая'} />
            <SettingsMenuItem icon={<CreditCardIcon />} label="Управление подпиской" onClick={() => onOpenModal('subscription')}/>
            <SettingsMenuItem icon={<SparklesIcon />} label="Переход на Google AI Ultra" onClick={() => onOpenModal('subscription')}/>

            <div className="border-t border-white border-opacity-10 my-2"></div>
            
            <SettingsMenuItem icon={<MessageIcon />} label="Отправить отзыв" onClick={() => onOpenModal('feedback')}/>
            <SettingsMenuItem icon={<QuestionMarkCircleIcon />} label="Справка" hasArrow onClick={() => onOpenModal('help')}/>

             <div className="border-t border-white border-opacity-10 my-2"></div>

            <div className="px-4 py-3 text-sm">
                <div className="flex items-center">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                    <span>{isLocating ? 'Обновление...' : locationInfo.name}</span>
                </div>
                <div className="text-xs text-gray-400 ml-4">
                    <span>{locationInfo.source}</span> - <button className="text-blue-400 hover:underline disabled:text-gray-500 disabled:no-underline" onClick={onUpdateLocation} disabled={isLocating}>Обновить</button>
                </div>
            </div>

        </div>
    </div>
  );
};