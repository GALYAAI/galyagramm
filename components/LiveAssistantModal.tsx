import React, { useState, useEffect, useRef } from 'react';
// FIX: The 'LiveSession' type is not exported by the '@google/genai' package.
// It has been removed from the import statement.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { StopIcon } from './IconComponents';
import { hasApiKey, getApiKey } from '../services/geminiService';

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

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

interface LiveAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveAssistantModal: React.FC<LiveAssistantModalProps> = ({ isOpen, onClose }) => {
    const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'closed'>('idle');
    const [statusMessage, setStatusMessage] = useState('Нажмите, чтобы начать разговор');
    const [transcriptionHistory, setTranscriptionHistory] = useState<{ speaker: 'Вы' | 'GalyaGPT', text: string }[]>([]);
    const [currentInput, setCurrentInput] = useState('');
    const [currentOutput, setCurrentOutput] = useState('');

    // FIX: The 'LiveSession' type is not exported. Using 'any' as a workaround to avoid a type error.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<{ input: AudioContext; output: AudioContext; } | null>(null);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSources = useRef<Set<AudioBufferSourceNode>>(new Set()).current;
    const nextStartTime = useRef(0);
    const transcriptionContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (transcriptionContainerRef.current) {
            transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight;
        }
    }, [transcriptionHistory, currentInput, currentOutput]);

    const cleanup = () => {
        console.log('Cleaning up live session...');
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        audioStreamRef.current?.getTracks().forEach(track => track.stop());
        audioStreamRef.current = null;

        if (scriptProcessorRef.current && sourceNodeRef.current && audioContextRef.current?.input) {
            sourceNodeRef.current.disconnect(scriptProcessorRef.current);
            scriptProcessorRef.current.disconnect(audioContextRef.current.input.destination);
        }
        scriptProcessorRef.current = null;
        sourceNodeRef.current = null;
        
        audioContextRef.current?.input.close().catch(console.error);
        audioContextRef.current?.output.close().catch(console.error);
        audioContextRef.current = null;

        outputSources.forEach(source => source.stop());
        outputSources.clear();
        nextStartTime.current = 0;

        setConnectionState('idle');
        setStatusMessage('Нажмите, чтобы начать разговор');
        setTranscriptionHistory([]);
        setCurrentInput('');
        setCurrentOutput('');
    };

    useEffect(() => {
        if (!isOpen) {
            cleanup();
        }
    }, [isOpen]);

    const startSession = async () => {
        if (!hasApiKey()) {
            setConnectionState('error');
            setStatusMessage("API-ключ не найден. Пожалуйста, добавьте его в настройках.");
            return;
        }

        setConnectionState('connecting');
        setStatusMessage('Подключение...');
        setTranscriptionHistory([]);
        setCurrentInput('');
        setCurrentOutput('');

        try {
            const ai = new GoogleGenAI({ apiKey: getApiKey() as string });
            audioContextRef.current = {
                input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
                output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }),
            };
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setConnectionState('connected');
                        setStatusMessage('В эфире. Говорите...');
                        const inputAudioContext = audioContextRef.current!.input;
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        sourceNodeRef.current = source;
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.inputTranscription) {
                            setCurrentInput(prev => prev + message.serverContent.inputTranscription.text);
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentOutput(prev => prev + message.serverContent.outputTranscription.text);
                        }
                        if (message.serverContent?.turnComplete) {
                            setCurrentInput(prevInput => {
                                setCurrentOutput(prevOutput => {
                                    const newHistoryEntries = [];
                                    if (prevInput.trim()) {
                                        newHistoryEntries.push({ speaker: 'Вы' as const, text: prevInput });
                                    }
                                    if (prevOutput.trim()) {
                                        newHistoryEntries.push({ speaker: 'GalyaGPT' as const, text: prevOutput });
                                    }
                                    if (newHistoryEntries.length > 0) {
                                        setTranscriptionHistory(prevHistory => [...prevHistory, ...newHistoryEntries]);
                                    }
                                    return ''; // Reset current output
                                });
                                return ''; // Reset current input
                            });
                        }
                        
                        // Handle audio
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            const outputAudioContext = audioContextRef.current!.output;
                            nextStartTime.current = Math.max(nextStartTime.current, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            source.addEventListener('ended', () => outputSources.delete(source));
                            source.start(nextStartTime.current);
                            nextStartTime.current += audioBuffer.duration;
                            outputSources.add(source);
                        }

                        if (message.serverContent?.interrupted) {
                             outputSources.forEach(source => source.stop());
                             outputSources.clear();
                             nextStartTime.current = 0;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setConnectionState('error');
                        setStatusMessage('Ошибка подключения. Попробуйте снова.');
                        cleanup();
                    },
                    onclose: (e: CloseEvent) => {
                        console.log('Live session closed');
                        setConnectionState('closed');
                        setStatusMessage('Сессия завершена.');
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
            });
        } catch (error) {
            console.error("Failed to start session:", error);
            setConnectionState('error');
            setStatusMessage('Не удалось начать сессию. Проверьте разрешения микрофона.');
            cleanup();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <div className="glass-panel w-full max-w-lg h-[80vh] max-h-[700px] rounded-2xl flex flex-col p-6 text-white animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <style>{`.animate-scale-in { animation: scaleIn 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; } @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Galya Ассистент</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white hover:bg-opacity-10">&times;</button>
                </div>
                
                <div ref={transcriptionContainerRef} className="flex-1 bg-black bg-opacity-20 rounded-lg p-4 overflow-y-auto scrollbar-thin-dark space-y-4">
                    {transcriptionHistory.map((t, i) => (
                        <div key={i}>
                            <p className={`font-bold ${t.speaker === 'Вы' ? 'text-blue-400' : 'text-purple-400'}`}>{t.speaker}</p>
                            <p className="text-gray-200">{t.text}</p>
                        </div>
                    ))}
                    {currentInput && (
                        <div>
                             <p className="font-bold text-blue-400">Вы</p>
                             <p className="text-gray-200">{currentInput}<span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span></p>
                        </div>
                    )}
                    {currentOutput && (
                         <div>
                            <p className="font-bold text-purple-400">GalyaGPT</p>
                            <p className="text-gray-200">{currentOutput}<span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span></p>
                        </div>
                    )}
                    {transcriptionHistory.length === 0 && !currentInput && !currentOutput && connectionState === 'idle' && (
                        <p className="text-gray-400 text-center mt-8">Здесь будет отображаться транскрипция вашего диалога.</p>
                    )}
                </div>

                <div className="mt-6 text-center">
                     <p className="text-sm text-gray-400 mb-2 h-5">{statusMessage}</p>
                    {connectionState === 'idle' || connectionState === 'error' || connectionState === 'closed' ? (
                        <button onClick={startSession} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300">
                            Начать разговор
                        </button>
                    ) : (
                        <button onClick={cleanup} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 flex items-center justify-center mx-auto space-x-2">
                           <StopIcon className="w-5 h-5" /> <span>Завершить</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
