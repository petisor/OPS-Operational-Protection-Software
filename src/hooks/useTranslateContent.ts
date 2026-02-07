import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

// Cache for translations to avoid repeated API calls
const translationCache = new Map<string, string>();

function getCacheKey(text: string, targetLang: string): string {
  return `${targetLang}:${text.substring(0, 100)}:${text.length}`;
}

interface UseTranslateContentOptions {
  enabled?: boolean;
}

export function useTranslateContent(
  originalText: string | undefined | null,
  options: UseTranslateContentOptions = {}
): { text: string; isTranslating: boolean } {
  const { language } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string>(originalText || "");
  const [isTranslating, setIsTranslating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    if (!originalText) {
      setTranslatedText("");
      return;
    }

    // If English, use original text
    if (language === "en" || !enabled) {
      setTranslatedText(originalText);
      return;
    }

    const cacheKey = getCacheKey(originalText, language);
    
    // Check cache first
    if (translationCache.has(cacheKey)) {
      setTranslatedText(translationCache.get(cacheKey)!);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const translateText = async () => {
      setIsTranslating(true);
      
      try {
        const { data, error } = await supabase.functions.invoke("translate-content", {
          body: {
            text: originalText,
            targetLanguage: language,
          },
        });

        if (error) throw error;

        if (data?.translatedText && !controller.signal.aborted) {
          translationCache.set(cacheKey, data.translatedText);
          setTranslatedText(data.translatedText);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Translation error:", err);
          // Fallback to original text on error
          setTranslatedText(originalText);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTranslating(false);
        }
      }
    };

    translateText();

    return () => {
      controller.abort();
    };
  }, [originalText, language, enabled]);

  return { text: translatedText, isTranslating };
}

// Hook for translating multiple items at once (more efficient)
export function useTranslateContentBatch<T extends { [key: string]: any }>(
  items: T[],
  fieldsToTranslate: (keyof T)[],
  options: UseTranslateContentOptions = {}
): { items: T[]; isTranslating: boolean } {
  const { language } = useLanguage();
  const [translatedItems, setTranslatedItems] = useState<T[]>(items);
  const [isTranslating, setIsTranslating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { enabled = true } = options;

  useEffect(() => {
    if (!items.length) {
      setTranslatedItems([]);
      return;
    }

    // If English, use original items
    if (language === "en" || !enabled) {
      setTranslatedItems(items);
      return;
    }

    // Check if all translations are cached
    const allCached = items.every((item) =>
      fieldsToTranslate.every((field) => {
        const text = item[field];
        if (typeof text !== "string") return true;
        return translationCache.has(getCacheKey(text, language));
      })
    );

    if (allCached) {
      const cachedItems = items.map((item) => {
        const translatedItem = { ...item };
        fieldsToTranslate.forEach((field) => {
          const text = item[field];
          if (typeof text === "string") {
            const cacheKey = getCacheKey(text, language);
            (translatedItem as any)[field] = translationCache.get(cacheKey) || text;
          }
        });
        return translatedItem;
      });
      setTranslatedItems(cachedItems);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const translateBatch = async () => {
      setIsTranslating(true);

      try {
        // Collect all unique texts to translate
        const textsToTranslate: { text: string; itemIndex: number; field: keyof T }[] = [];
        
        items.forEach((item, index) => {
          fieldsToTranslate.forEach((field) => {
            const text = item[field];
            if (typeof text === "string" && !translationCache.has(getCacheKey(text, language))) {
              textsToTranslate.push({ text, itemIndex: index, field });
            }
          });
        });

        if (textsToTranslate.length === 0) {
          setTranslatedItems(items);
          setIsTranslating(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke("translate-content", {
          body: {
            texts: textsToTranslate.map((t) => t.text),
            targetLanguage: language,
          },
        });

        if (error) throw error;

        if (data?.translatedTexts && !controller.signal.aborted) {
          // Cache and apply translations
          const translatedTexts = data.translatedTexts as string[];
          textsToTranslate.forEach((item, idx) => {
            const cacheKey = getCacheKey(item.text, language);
            translationCache.set(cacheKey, translatedTexts[idx] || item.text);
          });

          // Build translated items
          const newItems = items.map((item, index) => {
            const translatedItem = { ...item };
            fieldsToTranslate.forEach((field) => {
              const text = item[field];
              if (typeof text === "string") {
                const cacheKey = getCacheKey(text, language);
                (translatedItem as any)[field] = translationCache.get(cacheKey) || text;
              }
            });
            return translatedItem;
          });

          setTranslatedItems(newItems);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Batch translation error:", err);
          setTranslatedItems(items);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsTranslating(false);
        }
      }
    };

    translateBatch();

    return () => {
      controller.abort();
    };
  }, [items, language, enabled, fieldsToTranslate.join(",")]);

  return { items: translatedItems, isTranslating };
}
