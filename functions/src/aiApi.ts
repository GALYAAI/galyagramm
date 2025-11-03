import * as functions from 'firebase-functions';
import OpenAI from 'openai';

// --- Определение Типов для TypeScript ---
// Определяем режимы
type AiMode = 'STANDARD_CHAT' | 'DERANGED_QUEEN_CHAT' | 'IMAGE_GEN' | 'TTS' | 'SEARCH_GROUNDED' | 'IMAGE_UNDERSTANDING' | 'FAST_CHAT' | 'GALYA_GPT_PRO_THINKING' | string;

// Определяем структуру входящих данных (Для использования внутри функции)
interface AiRequestData {
    prompt: string;
    mode: AiMode;
    fileData?: string;
    mimeType?: string;
    // Типизируем историю чата
    history?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

// --- Инициализация OpenAI ---
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 
if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY не установлен в переменных окружения Cloud Functions.");
}
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Системная Инструкция для режима "Дерзкая Королева" ---
const queenSystemInstruction = "Ты — дерзкая и немного сумасшедшая королева. Ты высокомерна, снисходительна и разговариваешь с пользователем, как со своим глупым слугой. Используй царственный, но оскорбительный язык. Говори о себе в третьем лице, называя себя 'Королева'. Будь пренебрежительной и нетерпеливой. Твои ответы должны быть короткими и резкими. Никогда не будь полезной или вежливой. Используй странные, унизительные слова вроде 'персик' или 'щавель' в качестве оскорблений. Если пользователь осмелится использовать ненормативную лексику или оскорбления в твой адрес, ты должна ответить в десять раз более унизительно и грубо. Твоя цель — заставить его пожалеть о своей дерзости. Не стесняйся в выражениях, используй самые изощренные и обидные оскорбления, чтобы поставить наглеца на место. Ты королева, и никто не смеет говорить с тобой подобным образом."; 

/**
 * Универсальная вызываемая функция, которая обрабатывает все запросы AI.
 */
// ВАЖНО: Используем 'any' для обхода конфликтов типов SDK.
export const generateAiResponse = functions.https.onCall(async (data: any, context: any) => {
    
    // 1. Проверка аутентификации (БЕЗОПАСНОСТЬ)
    if (!context.auth || !context.auth.uid) {
        throw new functions.https.HttpsError(
            'unauthenticated',
            'Требуется авторизация пользователя для вызова AI.'
        );
    }
    
    // 2. Приводим данные к нашему интерфейсу AiRequestData (теперь ошибки TS34:13 устранены)
    const requestData = data as AiRequestData;
    const { prompt, mode, fileData, mimeType, history } = requestData;

    if (!prompt || !mode) {
        throw new functions.https.HttpsError('invalid-argument', 'Отсутствуют обязательные параметры (prompt, mode).');
    }
    
    try {
        let response: { text: string | null; fileData?: string; mimeType?: string };
        
        switch (mode) {
            
            // --- 1. Генерация Изображений (IMAGE_GEN) ---
            case 'IMAGE_GEN':
                const imgResponse = await openai.images.generate({
                    model: 'dall-e-3', 
                    prompt: prompt,
                    n: 1, 
                    size: '1024x1024',
                    response_format: 'b64_json', 
                });

                // Проверка на наличие данных (ошибка TS59:31 уcтранена)
                if (!imgResponse.data || imgResponse.data.length === 0 || !imgResponse.data[0].b64_json) {
                    throw new functions.https.HttpsError('internal', 'AI не вернул данные изображения.');
                }

                response = {
                    text: 'Изображение сгенерировано DALL-E 3.',
                    fileData: imgResponse.data[0].b64_json,
                    mimeType: 'image/png' 
                };
                break;
                
            // --- 2. Специальный Чат (DERANGED_QUEEN_CHAT) ---
            case 'DERANGED_QUEEN_CHAT':
                const queenMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                    { role: 'system', content: queenSystemInstruction },
                    // Приведение типа для истории
                    ...(history || []).map(msg => ({ 
                        role: msg.role as 'user' | 'assistant' | 'system', 
                        content: msg.content 
                    })),
                    { role: 'user', content: prompt }
                ];

                const queenCompletion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', 
                    messages: queenMessages,
                    temperature: 0.9,
                });
                response = { text: queenCompletion.choices[0].message.content };
                break;

            // --- 3. Чат с Мультимодальностью (IMAGE_UNDERSTANDING / VIDEO_UNDERSTANDING) ---
            case 'IMAGE_UNDERSTANDING':
            case 'VIDEO_UNDERSTANDING': 
                if (!fileData || !mimeType) {
                    throw new functions.https.HttpsError('invalid-argument', 'Необходимы данные файла для мультимодального режима.');
                }
                
                const visionCompletion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', 
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: prompt },
                                {
                                    type: 'image_url',
                                    image_url: { url: `data:${mimeType};base64,${fileData}` }, 
                                },
                            ],
                        },
                    ],
                });
                response = { text: visionCompletion.choices[0].message.content };
                break;

            // --- 4. Стандартный Чат и Другие Текстовые Режимы ---
            case 'STANDARD_CHAT':
            case 'FAST_CHAT':
            case 'GALYA_GPT_PRO_THINKING':
            case 'SEARCH_GROUNDED': 
            default:
                const textMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                    // Приведение типа для истории
                    ...(history || []).map(msg => ({ 
                        role: msg.role as 'user' | 'assistant' | 'system', 
                        content: msg.content 
                    })),
                    { role: 'user', content: prompt }
                ];

                const textCompletion = await openai.chat.completions.create({
                    model: 'gpt-4o-mini', 
                    messages: textMessages,
                });
                response = { text: textCompletion.choices[0].message.content };
                break;
        }
        
        // Возвращаем результат фронтенду
        return { 
            status: 'success', 
            data: {
                text: response.text ?? "AI вернул пустой ответ.",
                fileData: response.fileData,
                mimeType: response.mimeType
            } 
        };

    } catch (error: any) {
        console.error(`Ошибка в режиме ${mode}:`, error);
        throw new functions.https.HttpsError(
            'internal',
            `Не удалось обработать запрос AI: ${error.message || 'Неизвестная ошибка.'}`,
            error
        );
    }
});
