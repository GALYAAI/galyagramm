import React, { useState, useEffect } from 'react';
import { KeyIcon } from './IconComponents';

interface VideoGenPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (aspectRatio: '16:9' | '9:16') => void;
  prompt: string;
}

export const VideoGenPromptModal: React.FC<VideoGenPromptModalProps> = ({ isOpen, onClose, onGenerate, prompt }) => {
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsCheckingApiKey(true);
      // @ts-ignore
      window.aistudio?.hasSelectedApiKey().then((hasKey: boolean) => {
        setApiKeySelected(hasKey);
        setIsCheckingApiKey(false);
      });
    }
  }, [isOpen]);

  const handleSelectKey = async () => {
    try {
        // @ts-ignore
        await window.aistudio?.openSelectKey();
        // Assume key selection was successful to mitigate race conditions
        setApiKeySelected(true);
    } catch (e) {
        console.error("Error opening API key selection:", e);
    }
  };
  
  const handleGenerateClick = () => {
    if (apiKeySelected) {
        onGenerate(aspectRatio);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
        <div className="glass-panel w-full max-w-md rounded-2xl flex flex-col p-6 text-white animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <style>{`.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; } @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
            
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Параметры видео</h2>
                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-white hover:bg-opacity-10 text-2xl leading-none">&times;</button>
            </div>
            
            <p className="text-sm text-gray-400 mb-2">Ваш запрос:</p>
            <p className="bg-black bg-opacity-20 rounded-lg p-3 text-sm border border-gray-600 mb-4">{prompt}</p>

            <p className="text-sm font-medium text-gray-300 mb-2">Соотношение сторон:</p>
            <div className="flex space-x-2 mb-6">
                <button onClick={() => setAspectRatio('16:9')} className={`flex-1 p-3 rounded-lg border-2 transition-colors ${aspectRatio === '16:9' ? 'bg-blue-600 border-blue-500' : 'bg-zinc-700 border-transparent hover:bg-zinc-600'}`}>
                    <div className="w-full h-12 bg-zinc-800 rounded"></div>
                    <span className="block mt-2 text-sm font-semibold">16:9 Пейзаж</span>
                </button>
                 <button onClick={() => setAspectRatio('9:16')} className={`flex-1 p-3 rounded-lg border-2 transition-colors ${aspectRatio === '9:16' ? 'bg-blue-600 border-blue-500' : 'bg-zinc-700 border-transparent hover:bg-zinc-600'}`}>
                    <div className="w-full h-12 bg-zinc-800 rounded flex justify-center items-center"><div className="w-6 h-10 bg-zinc-900 rounded-sm"></div></div>
                    <span className="block mt-2 text-sm font-semibold">9:16 Портрет</span>
                </button>
            </div>
            
            {isCheckingApiKey ? (
                <div className="h-10 w-full bg-zinc-700 rounded-lg animate-pulse"></div>
            ) : apiKeySelected ? (
                 <button 
                    onClick={handleGenerateClick} 
                    className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                >
                    Сгенерировать
                </button>
            ) : (
                <div className="bg-yellow-900 bg-opacity-40 border border-yellow-700 rounded-lg p-3 text-center">
                    <p className="text-sm text-yellow-200 mb-2">Для генерации видео требуется выбрать API-ключ. Информацию о тарифах можно найти <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">здесь</a>.</p>
                    <button 
                        onClick={handleSelectKey} 
                        className="w-full px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white font-semibold transition-colors flex items-center justify-center space-x-2"
                    >
                       <KeyIcon className="w-5 h-5" /> <span>Выбрать API-ключ</span>
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};
