import React, { useState, useRef, useEffect } from 'react';
import { Message, Role } from '../types';
import { GoogleIcon, HeadsetIcon, StopIcon } from './IconComponents';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSpeech } from '../services/geminiService';

// Audio helper functions
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


interface MessageDisplayProps {
    message: Message;
    userInitial: string;
    onImageClick: (url: string) => void;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({ message, userInitial, onImageClick }) => {
    const isUser = message.role === Role.USER;
    const [playbackState, setPlaybackState] = useState<'idle' | 'loading' | 'playing'>('idle');
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
                audioSourceRef.current.onended = null;
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, []);

    const handlePlayback = async () => {
        if (audioSourceRef.current && playbackState === 'playing') {
            audioSourceRef.current.stop();
            return;
        }

        if (playbackState === 'loading') return;

        const textToSpeak = message.parts.map(p => p.text).filter(Boolean).join('\n');
        if (!textToSpeak.trim()) return;

        setPlaybackState('loading');

        try {
            const base64Audio = await generateSpeech(textToSpeak);
            if (!base64Audio) throw new Error("Не удалось сгенерировать аудио.");

            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            }
            
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const decodedData = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedData, audioContextRef.current, 24000, 1);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            
            source.onended = () => {
                setPlaybackState('idle');
                audioSourceRef.current = null;
            };
            
            source.start();
            audioSourceRef.current = source;
            setPlaybackState('playing');
        } catch (error) {
            console.error("Ошибка воспроизведения аудио:", error);
            alert(error instanceof Error ? error.message : "Произошла неизвестная ошибка.");
            setPlaybackState('idle');
        }
    };

    const hasTextContent = message.parts.some(p => p.text && p.text.trim().length > 0);

    return (
        <div className={`flex items-start space-x-4 py-4 ${!isUser ? 'bg-black bg-opacity-20 -mx-4 p-4 rounded-2xl' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${isUser ? 'bg-gray-600' : 'bg-gradient-to-br from-purple-600 to-blue-500'}`}>
                {isUser ? userInitial : "G"}
            </div>
            <div className="flex-1">
                <span className="font-bold">{isUser ? "Вы" : "GalyaGPT"}</span>
                <div className="prose prose-invert max-w-none prose-p:text-gray-300">
                    {message.parts.map((part, index) => (
                        <div key={index}>
                            {part.isLoading && (
                                <div className="flex items-center space-x-2 animate-pulse mt-2">
                                    <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                                    {part.loadingText && <p className="text-sm text-gray-400">{part.loadingText}</p>}
                                </div>
                            )}
                            {part.text && <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>}
                            {part.imageUrl && (
                                <img 
                                    src={part.imageUrl} 
                                    alt="Generated content" 
                                    className="mt-2 rounded-lg max-w-sm cursor-pointer hover:opacity-80 transition-opacity" 
                                    onClick={() => onImageClick(part.imageUrl!)}
                                />
                            )}
                            {part.audioUrl && <audio src={part.audioUrl} controls className="mt-2" />}
                            {part.sources && part.sources.length > 0 && (
                                <div className="mt-4">
                                    <h4 className="text-sm font-semibold text-gray-400 mb-2">Источники:</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {part.sources.map((source, i) => (
                                            <a 
                                                key={i} 
                                                href={source.uri} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-gray-300 text-sm px-3 py-1.5 rounded-lg no-underline transition-colors shadow-sm"
                                            >
                                                <GoogleIcon className="w-4 h-4 flex-shrink-0" />
                                                <span className="truncate">{source.title}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                {!isUser && hasTextContent && (
                    <div className="mt-2">
                        <button 
                            onClick={handlePlayback}
                            disabled={playbackState === 'loading'}
                            className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-wait group"
                            aria-label={playbackState === 'playing' ? "Остановить озвучивание" : "Озвучить текст"}
                        >
                            {playbackState === 'loading' && <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}
                            {playbackState === 'playing' && <StopIcon className="w-5 h-5 text-gray-300" />}
                            {playbackState === 'idle' && <HeadsetIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-200" />}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};