import { GoogleGenAI, GenerateContentResponse, Modality, Type, Chat, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AiMode } from '../types';

// --- API Key Management ---
const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const getApiKey = (): string | null => {
  // Ключ "вшит" в код
  return "AIzaSyAiu_FQGMh2F9ScAzrCKXx4bQISL-pmrMM"; 
};

export const setApiKey = (key: string): void => {
    if (key && key.trim()) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
};

export const hasApiKey = (): boolean => !!getApiKey();

const createAiInstance = () => {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("API ключ не указан. Пожалуйста, установите его в настройках.");
    }
    return new GoogleGenAI({ apiKey });
};
// --- End API Key Management ---

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = (error) => reject(error);
    });
};

export async function generateSimpleText(prompt: string): Promise<string> {
    const ai = createAiInstance();
    try {
        const response = await ai.models.generateContent({ 
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: { safetySettings }
        });
        return response.text;
    } catch (e) {
        console.error("Error generating simple text:", e);
        if (e instanceof Error && e.message.includes("API ключ не указан")) {
            throw e; // re-throw to be caught by caller
        }
        return "";
    }
}

export async function generateSpeech(text: string): Promise<string | null> {
    const ai = createAiInstance();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;

    } catch (error) {
        console.error("Error generating speech:", error);
        return null;
    }
}


const modelMapping: Record<AiMode, string> = {
    [AiMode.STANDARD_CHAT]: 'gemini-2.5-flash',
    [AiMode.FAST_CHAT]: 'gemini-2.5-flash-lite',
    [AiMode.GALYA_GPT_PRO_THINKING]: 'gemini-2.5-pro',
    [AiMode.SEARCH_GROUNDED]: 'gemini-2.5-flash',
    [AiMode.IMAGE_GEN]: 'imagen-4.0-generate-001',
    [AiMode.IMAGE_EDIT]: 'gemini-2.5-flash-image',
    [AiMode.IMAGE_UNDERSTANDING]: 'gemini-2.5-flash',
    [AiMode.VIDEO_UNDERSTANDING]: 'gemini-2.5-pro',
    [AiMode.TTS]: 'gemini-2.5-flash-preview-tts',
    [AiMode.LIVE_AUDIO]: 'gemini-2.5-flash-native-audio-preview-09-2025',
    [AiMode.DERANGED_QUEEN_CHAT]: 'gemini-2.5-flash',
};

const queenSystemInstruction = "Ты — дерзкая и немного сумасшедшая королева. Ты высокомерна, снисходительна и разговариваешь с пользователем, как со своим глупым слугой. Используй царственный, но оскорбительный язык. Говори о себе в третьем лице, называя себя 'Королева'. Будь пренебрежительной и нетерпеливой. Твои ответы должны быть короткими и резкими. Никогда не будь полезной или вежливой. Используй странные, унизительные слова вроде 'персик' или 'щавель' в качестве оскорблений. Если пользователь осмелится использовать ненормативную лексику или оскорбления в твой адрес, ты должна ответить в десять раз более унизительно и грубо. Твоя цель — заставить его пожалеть о своей дерзости. Не стесняйся в выражениях, используй самые изощренные и обидные оскорбления, чтобы поставить наглеца на место. Ты королева, и никто не смеет говорить с тобой подобным образом.";

export async function generateResponse(
    prompt: string,
    mode: AiMode,
    file?: { data: string; mimeType: string }
): Promise<GenerateContentResponse> {
    const ai = createAiInstance();
    const model = modelMapping[mode];

    switch (mode) {
        case AiMode.IMAGE_GEN:
            const imgGenResponse = await ai.models.generateImages({
                model: model,
                prompt: prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });
            // Adapt response to GenerateContentResponse structure
            return {
                text: '',
                candidates: [{
                    content: {
                        parts: imgGenResponse.generatedImages.map(img => ({
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: img.image.imageBytes
                            }
                        })),
                        role: 'model'
                    }
                }],
            } as unknown as GenerateContentResponse;

        case AiMode.IMAGE_EDIT:
        case AiMode.IMAGE_UNDERSTANDING:
        case AiMode.VIDEO_UNDERSTANDING:
            if (!file) throw new Error("A file is required for this mode.");
            return ai.models.generateContent({
                model: model,
                contents: {
                    parts: [
                        { text: prompt },
                        { inlineData: { data: file.data, mimeType: file.mimeType } }
                    ],
                },
                config: {
                     ...(mode === AiMode.IMAGE_EDIT && { responseModalities: [Modality.IMAGE] }),
                     safetySettings,
                }
            });

        case AiMode.TTS:
             const ttsResponse = await ai.models.generateContent({
                model: model,
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                    },
                },
            });
            return ttsResponse;

        case AiMode.SEARCH_GROUNDED:
            return ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }],
                    safetySettings,
                },
            });

        case AiMode.GALYA_GPT_PRO_THINKING:
            return ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    thinkingConfig: { thinkingBudget: 32768 },
                    safetySettings,
                },
            });
        
        case AiMode.DERANGED_QUEEN_CHAT:
             return ai.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    systemInstruction: queenSystemInstruction,
                    safetySettings,
                },
            });

        case AiMode.FAST_CHAT:
             return ai.models.generateContent({ model: model, contents: prompt, config: { safetySettings } });

        case AiMode.STANDARD_CHAT:
        default:
             return ai.models.generateContent({ model: model, contents: prompt, config: { safetySettings } });
    }
}

export function createChat(mode: AiMode): Chat {
    const ai = createAiInstance();
    const model = modelMapping[mode];
    
    let specificConfig: any = {};

    if (mode === AiMode.GALYA_GPT_PRO_THINKING) {
        specificConfig = { thinkingConfig: { thinkingBudget: 32768 } };
    } else if (mode === AiMode.SEARCH_GROUNDED) {
        specificConfig = { tools: [{ googleSearch: {} }] };
    } else if (mode === AiMode.DERANGED_QUEEN_CHAT) {
        specificConfig = { systemInstruction: queenSystemInstruction };
    }

    const finalConfig = {
        ...specificConfig,
        safetySettings,
    };

    return ai.chats.create({ model, config: finalConfig });
}