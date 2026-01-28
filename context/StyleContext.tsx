import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    applyHackerStyle, 
    applyLeetSpeak, 
    applyHackerJargon,
    obfuscateSensitiveData,
    applyFullStyle,
    applyAntiFingerprintMeasures 
} from '../utils/styleEngine';

interface StyleOptions {
    leet: boolean;
    jargon: boolean;
    obfuscate: boolean;
    profanity: boolean;
    emojis: boolean;
}

interface StyleContextType {
    format: (text: string) => string;
    formatFull: (text: string, options?: Partial<StyleOptions>) => string;
    leetify: (text: string, intensity?: number) => string;
    jargonize: (text: string) => string;
    sanitize: (text: string) => string;
    options: StyleOptions;
    setOptions: React.Dispatch<React.SetStateAction<StyleOptions>>;
    antiFingerprintEnabled: boolean;
    toggleAntiFingerprint: () => void;
}

const defaultOptions: StyleOptions = {
    leet: false,
    jargon: false,
    obfuscate: true,
    profanity: true,
    emojis: true
};

const StyleContext = createContext<StyleContextType | undefined>(undefined);

interface StyleProviderProps {
    children: ReactNode;
    enableAntiFingerprint?: boolean;
}

export const StyleProvider: React.FC<StyleProviderProps> = ({ 
    children, 
    enableAntiFingerprint = true 
}) => {
    const [options, setOptions] = useState<StyleOptions>(defaultOptions);
    const [antiFingerprintEnabled, setAntiFingerprintEnabled] = useState(enableAntiFingerprint);

    // Apply anti-fingerprinting measures on mount
    useEffect(() => {
        if (antiFingerprintEnabled) {
            applyAntiFingerprintMeasures();
        }
    }, [antiFingerprintEnabled]);

    // Basic format with current options
    const format = (text: string): string => {
        return applyHackerStyle(text);
    };

    // Full format with all pipelines
    const formatFull = (text: string, overrideOptions?: Partial<StyleOptions>): string => {
        return applyFullStyle(text, { ...options, ...overrideOptions });
    };

    // Individual utilities
    const leetify = (text: string, intensity?: number): string => {
        return applyLeetSpeak(text, intensity);
    };

    const jargonize = (text: string): string => {
        return applyHackerJargon(text);
    };

    const sanitize = (text: string): string => {
        return obfuscateSensitiveData(text);
    };

    const toggleAntiFingerprint = () => {
        setAntiFingerprintEnabled(prev => !prev);
    };

    return (
        <StyleContext.Provider value={{ 
            format, 
            formatFull,
            leetify,
            jargonize,
            sanitize,
            options,
            setOptions,
            antiFingerprintEnabled,
            toggleAntiFingerprint
        }}>
            {children}
        </StyleContext.Provider>
    );
};

export const useStyle = (): StyleContextType => {
    const context = useContext(StyleContext);
    if (context === undefined) {
        throw new Error('useStyle must be used within a StyleProvider');
    }
    return context;
};

export default StyleContext;
