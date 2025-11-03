import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatSession, AiMode, Message, Role, MessagePart } from '../types';
import { generateResponse, fileToBase64, createChat, generateSimpleText, getApiKey } from '../services/geminiService';
import { MessageDisplay } from './MessageDisplay';
import { InputBar } from './InputBar';
import { LiveAssistantModal } from './LiveAssistantModal';
import { GenerateContentResponse, Chat } from '@google/genai';


interface ChatViewProps {
    session: ChatSession;
    updateSession: (sessionId: string, updatedSession: Partial<ChatSession>) => void;
    userName: string;
    userInitial: string;
    onApiKeyMissing: () => void;
    onImageClick: (url: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({ session, updateSession, userName, userInitial, onApiKeyMissing, onImageClick }) => {
    const [messages, setMessages] = useState<Message[]>(session.messages);
    const [isLoading, setIsLoading] = useState(false);
    const [currentMode, setCurrentMode] = useState<AiMode>(session.mode);
    const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const initializeChat = useCallback(() => {
        try {
            const isChatMode = [AiMode.STANDARD_CHAT, AiMode.FAST_CHAT, AiMode.GALYA_GPT_PRO_THINKING, AiMode.SEARCH_GROUNDED, AiMode.DERANGED_QUEEN_CHAT].includes(currentMode);
            if (isChatMode) {
                chatRef.current = createChat(currentMode);
            } else {
                chatRef.current = null;
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes("API ключ не указан")) {
                onApiKeyMissing();
            } else {
                console.error("Failed to create chat:", error);
            }
            chatRef.current = null;
        }
    }, [currentMode, onApiKeyMissing]);

     useEffect(() => {
        initializeChat();
    }, [initializeChat]);

    useEffect(() => {
        updateSession(session.id, { messages, mode: currentMode });
    }, [messages, currentMode, session.id, updateSession]);

    const handleSend = async (prompt: string, file?: File) => {
        if (!prompt && !file) return;
        
        setIsLoading(true);

        const isFirstMessage = session.messages.length === 0;

        const userMessageParts: MessagePart[] = [];
        if (prompt) userMessageParts.push({ text: prompt });
        if (file) {
            const url = URL.createObjectURL(file);
            if (file.type.startsWith('image/')) {
                 userMessageParts.push({ imageUrl: url });
            }
        }

        const userMessage: Message = {
            id: `msg_${Date.now()}`,
            role: Role.USER,
            parts: userMessageParts,
        };
        setMessages(prev => [...prev, userMessage]);
        
        const loadingMessage: Message = {
            id: `msg_${Date.now()}_loading`,
            role: Role.MODEL,
            parts: [{ isLoading: true }],
        };
        setMessages(prev => [...prev, loadingMessage]);

        try {
            let response: GenerateContentResponse;

            if (chatRef.current) {
                response = await chatRef.current.sendMessage({ message: prompt });
            } else {
                 const fileData = file ? { data: await fileToBase64(file), mimeType: file.type } : undefined;
                 response = await generateResponse(prompt, currentMode, fileData);
            }
           
            const modelMessageParts: MessagePart[] = [];
            const text = response.text;
            if (text) {
                modelMessageParts.push({ text });
            }

            if (response.candidates?.[0]?.content?.parts) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const mimeType = part.inlineData.mimeType;
                        const data = part.inlineData.data;
                        const url = `data:${mimeType};base64,${data}`;
                        if (mimeType.startsWith('image/')) {
                            modelMessageParts.push({ imageUrl: url });
                        } else if (mimeType.startsWith('audio/')) {
                            modelMessageParts.push({ audioUrl: url });
                        }
                    }
                }
            }
             if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
                const sources = response.candidates[0].groundingMetadata.groundingChunks
                    .map(chunk => chunk.web ? ({ uri: chunk.web.uri, title: chunk.web.title || chunk.web.uri }) : null)
                    .filter(Boolean) as { uri: string; title: string }[];
                if(sources.length > 0) {
                    modelMessageParts.push({ sources });
                }
            }


            const modelMessage: Message = {
                id: `msg_${Date.now()}_model`,
                role: Role.MODEL,
                parts: modelMessageParts.length > 0 ? modelMessageParts : [{ text: "Не удалось сгенерировать ответ." }],
            };

            setMessages(prev => prev.filter(m => !m.parts.some(p => p.isLoading)).concat(modelMessage));
            
            if (isFirstMessage && prompt) {
                (async () => {
                    try {
                        const modelResponseText = response.text || '';
                        const titlePrompt = `Создай короткий заголовок (не более 5 слов) для этого диалога на основе первого запроса:\n\nЗапрос: "${prompt}"\n\nОтвет: "${modelResponseText}"\n\nЗаголовок:`;
                        const newTitleRaw = await generateSimpleText(titlePrompt);
                        const newTitle = newTitleRaw.replace(/["*]/g, '').trim();
                        if (newTitle) {
                            updateSession(session.id, { title: newTitle });
                        } else {
                            updateSession(session.id, { title: prompt.substring(0, 40) });
                        }
                    } catch (e) {
                        console.error("Failed to generate title:", e);
                        updateSession(session.id, { title: prompt.substring(0, 40) });
                    }
                })();
            }

        } catch (error) {
             setMessages(prev => prev.filter(m => !m.parts.some(p => p.isLoading))); // remove loading indicator
            if (error instanceof Error && error.message.includes("API ключ не указан")) {
                onApiKeyMissing();
            } else {
                console.error("Error generating response:", error);
                const errorMessage: Message = {
                    id: `msg_${Date.now()}_error`,
                    role: Role.MODEL,
                    parts: [{ text: `Извините, произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` }],
                };
                setMessages(prev => prev.concat(errorMessage));
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col max-h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin-dark">
                <div className="max-w-4xl mx-auto w-full">
                    {messages.length === 0 ? (
                        <div className="text-center mt-20">
                             <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-300 via-blue-400 to-purple-500">
                                Здравствуйте, {userName}
                            </h1>
                            <p className="text-gray-400 mt-4">Чем я могу вам сегодня помочь?</p>
                        </div>
                    ) : (
                        messages.map(msg => <MessageDisplay key={msg.id} message={msg} userInitial={userInitial} onImageClick={onImageClick} />)
                    )}
                     <div ref={messagesEndRef} />
                </div>
            </div>
            <div className="p-4 md:p-6 bg-transparent flex-shrink-0">
                <div className="max-w-4xl mx-auto w-full">
                    <InputBar
                        onSend={handleSend}
                        isLoading={isLoading}
                        currentMode={currentMode}
                        setCurrentMode={setCurrentMode}
                        onOpenAssistant={() => setIsAssistantModalOpen(true)}
                    />
                    <p className="text-xs text-center text-gray-500 mt-2">
                        GalyaGPT может совершать ошибки. Проверяйте важную информацию.
                    </p>
                </div>
            </div>
            <LiveAssistantModal
                isOpen={isAssistantModalOpen}
                onClose={() => setIsAssistantModalOpen(false)}
            />
        </div>
    );
};