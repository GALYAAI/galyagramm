import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon, SettingsIcon, MessageIcon } from './IconComponents';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    sessions: ChatSession[];
    activeSessionId: string | null;
    onNewChat: () => void;
    onSelectSession: (id: string) => void;
    onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, sessions, activeSessionId, onNewChat, onSelectSession, onOpenSettings }) => {
    return (
        <>
            {/* Backdrop for mobile overlay */}
            <div
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            ></div>

            {/* Sidebar Panel */}
            <aside
                className={`
                    bg-black bg-opacity-20 h-full flex flex-col flex-shrink-0
                    fixed lg:relative inset-y-0 left-0 z-40 w-64
                    transition-transform lg:transition-all duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 ${isOpen ? 'lg:w-64' : 'lg:w-0'}
                `}
            >
                <div className="w-64 h-full flex flex-col overflow-hidden">
                    <div className="p-4 flex-shrink-0">
                        <button 
                            onClick={onNewChat}
                            className="flex items-center justify-between w-full bg-white bg-opacity-5 hover:bg-opacity-10 text-white font-semibold py-2 px-4 rounded-xl transition duration-300"
                        >
                            <span>Новый чат</span>
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto scrollbar-thin-dark px-2">
                        <h2 className="text-sm font-bold text-gray-400 px-2 my-2">Недавние</h2>
                        <ul className="space-y-1">
                            {sessions.map(session => (
                                <li key={session.id}>
                                    <button
                                        onClick={() => onSelectSession(session.id)}
                                        className={`w-full text-left flex items-center space-x-3 px-2 py-2 rounded-full text-sm transition-colors ${
                                            activeSessionId === session.id ? 'bg-white bg-opacity-20 text-white' : 'hover:bg-white hover:bg-opacity-5'
                                        }`}
                                    >
                                        <MessageIcon className="h-4 w-4 flex-shrink-0" />
                                        <span className="truncate flex-1">{session.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-4 border-t border-white border-opacity-10">
                        <button onClick={onOpenSettings} className="w-full text-left flex items-center space-x-3 px-2 py-2 rounded-md hover:bg-white hover:bg-opacity-5 text-sm">
                            <SettingsIcon className="h-5 w-5" />
                            <span>Настройки</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};
