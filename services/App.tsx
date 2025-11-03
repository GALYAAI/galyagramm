import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsMenu } from './components/SettingsMenu';
import { ChatSession, AiMode, User, Role } from './types';
import { MenuIcon, SparklesIcon, CreditCardIcon, ShareIcon, KeyIcon } from './components/IconComponents';
import { getApiKey, setApiKey } from './services/geminiService';


// --- MODAL COMPONENTS ---

const GenericModal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
        <div className="glass-panel w-full max-w-md rounded-2xl flex flex-col p-6 text-white animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <style>{`.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; } @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{title}</h2>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white hover:bg-opacity-10 text-2xl leading-none">&times;</button>
            </div>
            {children}
        </div>
    </div>
);

const ApiKeyModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [key, setKey] = useState(() => getApiKey() || '');

    const handleSave = () => {
        setApiKey(key);
        onClose();
    };

    return (
        <GenericModal onClose={onClose} title="Настроить API-ключ">
            <p className="text-sm text-gray-400 mb-4">
                Для работы GalyaGPT требуется API-ключ Google AI. Вы можете получить его бесплатно в <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a>.
            </p>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-400 mb-2">Ваш API-ключ</label>
            <input
                id="apiKey"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Вставьте ваш ключ сюда"
            />
            <div className="flex justify-end mt-6">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">Отмена</button>
                <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors ml-2">Сохранить</button>
            </div>
        </GenericModal>
    );
};


const UpdateUserModal: React.FC<{ onClose: () => void; onSave: (name: string) => void; currentUser: User }> = ({ onClose, onSave, currentUser }) => {
    const [name, setName] = useState(currentUser.name);
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(name);
    };
    return (
        <GenericModal onClose={onClose} title="Персональный контекст">
            <form onSubmit={handleSubmit}>
                <p className="text-sm text-gray-400 mb-4">Изменение имени повлияет на то, как GalyaGPT обращается к вам.</p>
                <label htmlFor="name" className="block text-sm font-medium text-gray-400 mb-2">Ваше имя</label>
                <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Введите ваше имя"
                    required
                />
                <div className="flex justify-end mt-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">Отмена</button>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors ml-2">Сохранить</button>
                </div>
            </form>
        </GenericModal>
    );
};

const FeedbackModal: React.FC<{ onClose: () => void; onSend: (text: string) => void; text: string; setText: (text: string) => void; }> = ({ onClose, onSend, text, setText }) => {
    const handleSubmit = () => onSend(text);
    return (
        <GenericModal onClose={onClose} title="Отправить отзыв">
            <p className="text-sm text-gray-400 mb-4">Мы ценим ваше мнение. Пожалуйста, поделитесь своими мыслями.</p>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ваш отзыв..."
                className="w-full h-32 bg-[#353739] border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex justify-end mt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg hover:bg-white hover:bg-opacity-5 transition-colors">Отмена</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors ml-2">Отправить</button>
            </div>
        </GenericModal>
    );
};

const InfoModal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode }> = ({ onClose, title, children }) => (
    <GenericModal onClose={onClose} title={title}>
        <div className="text-gray-300 space-y-4">
            {children}
        </div>
        <div className="flex justify-end mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">Понятно</button>
        </div>
    </GenericModal>
);

const SubscriptionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <GenericModal onClose={onClose} title="Управление подпиской">
        <div className="space-y-4">
            <div className="border border-gray-600 p-4 rounded-lg">
                <h3 className="font-bold text-lg">GalyaGPT Free</h3>
                <p className="text-sm text-gray-400">Текущий план</p>
            </div>
            <div className="border border-gray-600 p-4 rounded-lg opacity-60">
                <h3 className="font-bold text-lg flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-purple-400" /> GalyaGPT Pro</h3>
                <p className="text-sm text-gray-400">Продвинутая модель для сложных задач.</p>
            </div>
            <div className="border border-gray-600 p-4 rounded-lg opacity-60">
                 <h3 className="font-bold text-lg flex items-center"><CreditCardIcon className="w-5 h-5 mr-2 text-yellow-400" /> Google AI Ultra</h3>
                <p className="text-sm text-gray-400">Самая мощная модель для максимальной производительности.</p>
            </div>
             <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="w-full block text-center mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors">Управлять подпиской</a>
        </div>
    </GenericModal>
);

const ShareChatModal: React.FC<{ onClose: () => void; session: ChatSession | null; userName: string; }> = ({ onClose, session, userName }) => {
    const [copyButtonText, setCopyButtonText] = useState('Копировать');

    if (!session) return null;

    const formatChat = () => {
        let formatted = `Чат с GalyaGPT: ${session.title}\n\n`;
        session.messages.forEach(msg => {
            const prefix = msg.role === Role.USER ? userName : 'GalyaGPT';
            const textContent = msg.parts.map(p => p.text).filter(Boolean).join('\n');
            if (textContent) {
                formatted += `${prefix}:\n${textContent}\n\n`;
            }
        });
        return formatted.trim();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(formatChat()).then(() => {
            setCopyButtonText('Скопировано!');
            setTimeout(() => setCopyButtonText('Копировать'), 2000);
        }, (err) => {
            console.error('Failed to copy chat: ', err);
            setCopyButtonText('Ошибка');
            setTimeout(() => setCopyButtonText('Копировать'), 2000);
        });
    };

    return (
        <GenericModal onClose={onClose} title="Поделиться чатом">
            <div className="bg-black bg-opacity-20 rounded-lg p-4 h-64 overflow-y-auto scrollbar-thin-dark mb-4 border border-gray-600">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap">{formatChat()}</pre>
            </div>
            <button
                type="button"
                onClick={handleCopy}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
            >
                {copyButtonText}
            </button>
        </GenericModal>
    );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
    const [user, setUser] = useState<User>({ name: "Пользователь", initial: "П" });
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [theme, setTheme] = useState('dark');
    const [locationInfo, setLocationInfo] = useState({ name: 'Определение...', source: 'Нажмите "Обновить"' });
    const [isLocating, setIsLocating] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');
    const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.add('light');
        } else {
            document.documentElement.classList.remove('light');
        }
    }, [theme]);

    useEffect(() => {
        const storedUser = localStorage.getItem('chatUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('chatUser', JSON.stringify(user));
    }, [user]);

    const startNewSession = useCallback(() => {
        const newSession: ChatSession = {
            id: `session_${Date.now()}`,
            title: "Новый чат",
            messages: [],
            mode: AiMode.STANDARD_CHAT,
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    }, []);

    useEffect(() => {
        const storedSessions = localStorage.getItem('chatSessions');
        if (storedSessions) {
            const parsedSessions = JSON.parse(storedSessions);
            if (parsedSessions.length > 0) {
                setSessions(parsedSessions);
                const storedActiveId = localStorage.getItem('activeSessionId');
                if (storedActiveId && parsedSessions.some((s: ChatSession) => s.id === storedActiveId)) {
                    setActiveSessionId(storedActiveId);
                } else {
                    setActiveSessionId(parsedSessions[0].id);
                }
                return;
            }
        }
        startNewSession();
    }, [startNewSession]);

    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('chatSessions', JSON.stringify(sessions));
        } else {
             localStorage.removeItem('chatSessions');
        }
        if (activeSessionId) {
            localStorage.setItem('activeSessionId', activeSessionId);
        } else {
            localStorage.removeItem('activeSessionId');
        }
    }, [sessions, activeSessionId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (lightboxImageUrl) {
                    setLightboxImageUrl(null);
                } else if (activeModal) {
                    setActiveModal(null);
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                startNewSession();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeModal, lightboxImageUrl, startNewSession]);

    const updateSession = (sessionId: string, updatedSession: Partial<ChatSession>) => {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updatedSession } : s));
    };

    const handleClearHistory = () => {
        if (window.confirm('Вы уверены, что хотите удалить всю историю чатов? Это действие необратимо.')) {
            setSessions([]);
            setActiveSessionId(null);
            startNewSession();
            setActiveModal(null);
        }
    };

    const handleUpdateUser = (name: string) => {
        if (name.trim()) {
            setUser({ name: name.trim(), initial: name.trim().charAt(0).toUpperCase() });
            setActiveModal(null);
        }
    };

    const handleUpdateLocation = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ru`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                const country = data.address?.country || 'Неизвестно';
                const city = data.address?.city || data.address?.town || data.address?.village || '';
                setLocationInfo({ name: city ? `${city}, ${country}` : country, source: 'По GPS' });
            } catch (error) {
                console.error("Reverse geocoding failed:", error);
                setLocationInfo({ name: 'Не удалось определить', source: 'Ошибка' });
            } finally {
                setIsLocating(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            setLocationInfo({ name: 'Доступ запрещен', source: 'Ошибка' });
            setIsLocating(false);
        }, { enableHighAccuracy: true });
    };

    const handleSendFeedback = (text: string) => {
        if (!text.trim()) {
            alert('Пожалуйста, введите ваш отзыв.');
            return;
        }
        console.log('Feedback submitted:', text);
        alert('Спасибо за ваш отзыв!');
        setFeedbackText('');
        setActiveModal(null);
    };

    const activeSession = sessions.find(s => s.id === activeSessionId) || null;

    const renderModal = () => {
        switch(activeModal) {
            case 'settings':
                return <SettingsMenu 
                          isOpen={true} 
                          onClose={() => setActiveModal(null)}
                          theme={theme}
                          setTheme={setTheme}
                          onClearHistory={handleClearHistory}
                          onOpenModal={setActiveModal}
                          locationInfo={locationInfo}
                          isLocating={isLocating}
                          onUpdateLocation={handleUpdateLocation}
                       />;
            case 'updateUser':
                return <UpdateUserModal onClose={() => setActiveModal(null)} onSave={handleUpdateUser} currentUser={user} />;
            case 'apiKey':
                return <ApiKeyModal onClose={() => setActiveModal(null)} />;
            case 'feedback':
                return <FeedbackModal onClose={() => setActiveModal(null)} onSend={handleSendFeedback} text={feedbackText} setText={setFeedbackText} />;
            case 'subscription':
                return <SubscriptionModal onClose={() => setActiveModal(null)} />;
            case 'shareChat':
                return <ShareChatModal onClose={() => setActiveModal(null)} session={activeSession} userName={user.name} />;
            case 'hotkeys':
                 return <InfoModal onClose={() => setActiveModal(null)} title="Горячие клавиши">
                    <ul className="space-y-3">
                        <li className="flex items-center"><code className="bg-white bg-opacity-10 px-2 py-1 rounded-md text-sm mr-3">Cmd/Ctrl + N</code> - Создать новый чат</li>
                        <li className="flex items-center"><code className="bg-white bg-opacity-10 px-2 py-1 rounded-md text-sm mr-3">Escape</code> - Закрыть окно</li>
                    </ul>
                </InfoModal>;
            case 'help':
                return <InfoModal onClose={() => setActiveModal(null)} title="Справка">
                    <p>Добро пожаловать в GalyaGPT! Используйте различные режимы для решения ваших задач: от быстрого ответа до генерации изображений. Нажмите на название режима над полем ввода, чтобы выбрать другой.</p>
                </InfoModal>;
            case 'info-connectedApps':
            case 'info-scheduled':
            case 'info-links':
                return <InfoModal onClose={() => setActiveModal(null)} title="В разработке">
                    <p>Эта функция находится в активной разработке и скоро будет доступна. Спасибо за ваше терпение!</p>
                </InfoModal>;
            default:
                return null;
        }
    };

    return (
        <div className="h-screen w-screen flex">
            {lightboxImageUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-80 z-[100] flex items-center justify-center backdrop-blur-sm animate-fade-in" onClick={() => setLightboxImageUrl(null)}>
                    <style>{`.animate-fade-in { animation: fadeIn 0.2s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
                    <img src={lightboxImageUrl} className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Просмотр изображения" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
            <Sidebar 
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                sessions={sessions}
                activeSessionId={activeSessionId}
                onNewChat={startNewSession}
                onSelectSession={setActiveSessionId}
                onOpenSettings={() => setActiveModal('settings')}
            />
            <main className="flex-1 flex flex-col transition-all duration-300 bg-black bg-opacity-10">
                <header className="flex items-center justify-between p-2 md:p-4 border-b border-white border-opacity-10">
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-full hover:bg-white hover:bg-opacity-10">
                            <MenuIcon className="h-6 w-6" />
                        </button>
                        <span className="text-xl font-medium">GalyaGPT</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => activeSession && setActiveModal('shareChat')} title="Поделиться чатом" disabled={!activeSession || activeSession.messages.length === 0} className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ShareIcon className="h-6 w-6" />
                        </button>
                        <span className="text-sm bg-white bg-opacity-10 px-3 py-1 rounded-full">ПРО</span>
                        <button onClick={() => setActiveModal('settings')} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center text-white font-bold">
                            {user.initial}
                        </button>
                    </div>
                </header>
                {activeSession ? (
                    <ChatView 
                        key={activeSession.id} 
                        session={activeSession}
                        updateSession={updateSession}
                        userName={user.name}
                        userInitial={user.initial}
                        onApiKeyMissing={() => setActiveModal('apiKey')}
                        onImageClick={setLightboxImageUrl}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-bold">Начните новый чат</h1>
                            <p className="text-gray-400 mt-4">Или выберите существующий из списка слева.</p>
                        </div>
                    </div>
                )}
            </main>
            {renderModal()}
        </div>
    );
};

export default App;