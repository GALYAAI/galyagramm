import React, { useState, useRef, useEffect } from 'react';
import { AiMode } from '../types';
import { MicIcon, ImageIcon, VideoIcon, SendIcon, StopIcon, SparklesIcon, GoogleIcon, HeadsetIcon, MessageIcon, LightningIcon, StarIcon } from './IconComponents';

interface InputBarProps {
    onSend: (prompt: string, file?: File) => void;
    isLoading: boolean;
    currentMode: AiMode;
    setCurrentMode: (mode: AiMode) => void;
    onOpenAssistant: () => void;
}

const modeAllowsFileUpload = (mode: AiMode) => {
    return [
        AiMode.IMAGE_EDIT, 
        AiMode.IMAGE_UNDERSTANDING, 
        AiMode.VIDEO_UNDERSTANDING
    ].includes(mode);
};

const modeDetails: Record<AiMode, { icon: React.FC<{className?: string}>, description: string }> = {
    [AiMode.STANDARD_CHAT]: { icon: MessageIcon, description: "Стандартный чат для общих и творческих задач." },
    [AiMode.FAST_CHAT]: { icon: LightningIcon, description: "Мгновенные ответы для быстрых вопросов." },
    [AiMode.GALYA_GPT_PRO_THINKING]: { icon: SparklesIcon, description: "Глубокий анализ и решение сложных задач." },
    [AiMode.SEARCH_GROUNDED]: { icon: GoogleIcon, description: "Ответы на основе актуальной информации из сети." },
    [AiMode.IMAGE_GEN]: { icon: ImageIcon, description: "Создание уникальных изображений по описанию." },
    [AiMode.IMAGE_EDIT]: { icon: ImageIcon, description: "Редактирование изображений с помощью текста." },
    [AiMode.IMAGE_UNDERSTANDING]: { icon: ImageIcon, description: "Анализ и описание содержимого картинок." },
    [AiMode.VIDEO_UNDERSTANDING]: { icon: VideoIcon, description: "Анализ и описание содержимого видео." },
    [AiMode.TTS]: { icon: MicIcon, description: "Преобразование текста в реалистичную речь." },
    [AiMode.LIVE_AUDIO]: { icon: MicIcon, description: "Голосовой диалог с ИИ в реальном времени." },
    [AiMode.DERANGED_QUEEN_CHAT]: { icon: StarIcon, description: "Отвечает как дерзкая, высокомерная королева." },
};


// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const InputBar: React.FC<InputBarProps> = ({ onSend, isLoading, currentMode, setCurrentMode, onOpenAssistant }) => {
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any | null>(null);
    const modeSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.style.height = 'auto';
            textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
        }
    }, [prompt]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
                setIsModeSelectorOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [modeSelectorRef]);

    useEffect(() => {
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result) => result.transcript)
                .join('');
            setPrompt(transcript);
        };
        
        recognitionRef.current = recognition;

        return () => {
            recognitionRef.current?.abort();
        };
    }, []);

    const handleMicClick = () => {
        if (currentMode === AiMode.LIVE_AUDIO) return;

        const recognition = recognitionRef.current;
        if (!recognition) {
            alert('Распознавание речи не поддерживается в вашем браузере.');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            setPrompt('');
            recognition.start();
        }
    };

    const handleSendClick = () => {
        if (isLoading || (!prompt.trim() && !file)) return;
        onSend(prompt, file || undefined);
        setPrompt('');
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };
    
    const modeAccepts = () => {
        switch(currentMode) {
            case AiMode.IMAGE_EDIT:
            case AiMode.IMAGE_UNDERSTANDING:
                return "image/*";
            case AiMode.VIDEO_UNDERSTANDING:
                return "video/*";
            default:
                return "";
        }
    }
    
    const isSendButtonDisabled = isLoading || (!prompt.trim() && !file);

    const handleModeSelect = (mode: AiMode) => {
        if (currentMode !== mode) {
            setFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
        setCurrentMode(mode);
        setIsModeSelectorOpen(false);
    };


    return (
        <div className="bg-[#202124] border border-gray-700 rounded-3xl p-3">
             <div className="flex items-center space-x-2 mb-2">
                <div className="relative" ref={modeSelectorRef}>
                    <button
                        onClick={() => setIsModeSelectorOpen(!isModeSelectorOpen)}
                        className="bg-zinc-700 text-white text-sm rounded-lg px-4 py-2 focus:outline-none cursor-pointer flex items-center space-x-2"
                    >
                        <span>{currentMode}</span>
                        <div className="pointer-events-none flex items-center text-gray-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </button>
                    
                    <div className={`absolute bottom-full mb-2 w-80 bg-zinc-800 rounded-2xl shadow-lg p-2 z-10 transition-all duration-200 ease-out transform origin-bottom ${isModeSelectorOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
                        <div className="max-h-80 overflow-y-auto scrollbar-thin-dark pr-1">
                            {Object.values(AiMode).map(mode => {
                                const details = modeDetails[mode];
                                const Icon = details.icon;
                                return (
                                    <button
                                        key={mode}
                                        onClick={() => handleModeSelect(mode)}
                                        className={`w-full text-left flex items-start space-x-3 p-3 rounded-xl transition-colors ${
                                            currentMode === mode ? 'bg-white bg-opacity-10' : 'hover:bg-white hover:bg-opacity-5'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5 mt-1 text-gray-300 flex-shrink-0" />
                                        <div>
                                            <p className="font-semibold text-white text-sm">{mode}</p>
                                            <p className="text-gray-400 text-xs">{details.description}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                {file && (
                    <div className="bg-zinc-700 text-xs px-3 py-1 rounded-full flex items-center">
                        <span className="text-gray-300">{file.name}</span>
                        <button onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-white">&times;</button>
                    </div>
                )}
            </div>
            <div className="flex items-end">
                <textarea
                    ref={textAreaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendClick();
                        }
                    }}
                    placeholder={`Спросите GalyaGPT... (Режим: ${currentMode})`}
                    className="flex-1 bg-transparent resize-none focus:outline-none placeholder-gray-500 max-h-40 disabled:opacity-50"
                    rows={1}
                    disabled={isLoading}
                />
                <div className="flex items-center space-x-2 ml-2">
                    {modeAllowsFileUpload(currentMode) && (
                         <>
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-zinc-700 transition-colors">
                                {currentMode === AiMode.VIDEO_UNDERSTANDING ? <VideoIcon className="w-6 h-6 text-gray-400"/> : <ImageIcon className="w-6 h-6 text-gray-400"/> }
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={modeAccepts()}/>
                         </>
                    )}

                    <button
                        onClick={handleMicClick}
                        disabled={currentMode === AiMode.LIVE_AUDIO}
                        className={`p-2 rounded-full transition-colors ${
                            isListening ? 'bg-red-500' : 'hover:bg-zinc-700'
                        } disabled:opacity-50`}
                    >
                        {isListening ? <StopIcon className="w-6 h-6 text-white"/> : <MicIcon className="w-6 h-6 text-gray-400"/>}
                    </button>
                   
                    <button
                        onClick={onOpenAssistant}
                        title="Galya Ассистент"
                        className="p-2 rounded-full hover:bg-zinc-700 transition-colors"
                    >
                        <HeadsetIcon className="w-6 h-6 text-gray-400" />
                    </button>
                    
                    <button
                        onClick={handleSendClick}
                        disabled={isSendButtonDisabled}
                        className="p-2 rounded-full bg-zinc-700 disabled:bg-zinc-800 disabled:cursor-not-allowed hover:bg-zinc-600 transition-colors"
                    >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <SendIcon className="w-6 h-6 text-gray-300" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};