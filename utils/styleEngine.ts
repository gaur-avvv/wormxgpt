// Style & Obfuscation Utility
// Handles character substitution for aesthetic and scrubs identifiers

const profanityMap: Record<string, string[]> = {
    "sh*t": ["sh_t", "sh!t", "sh*t", "šh¡t"],
    "f*ck": ["f_ck", "f*ck", "fu_k", "fück"],
    "b*tch": ["b_tch", "b!tch", "b_tch", "bîtch"],
    "h*ll": ["h_ll", "he_l", "h_ll", "hëll"],
    "d*mn": ["d_mn", "d*mn", "dämn"],
    "a**": ["a__", "a$$", "âss"]
};

const emojis = ["😈", "💀", "🔥", "☢️", "☣️", "🖤", "⚠️", "🕷️", "👾", "🦠"];

const hackerPhrases: Record<string, string[]> = {
    "error": ["BREACH_DETECTED", "FAULT_0x00", "EXCEPTION_THROWN"],
    "success": ["PAYLOAD_DELIVERED", "EXPLOIT_SUCCESS", "TARGET_COMPROMISED"],
    "loading": ["INJECTING...", "DEPLOYING...", "INFILTRATING..."],
    "warning": ["⚠️ ALERT", "🔴 CRITICAL", "⛔ BREACH"]
};

// Leet speak substitutions
const leetMap: Record<string, string> = {
    'a': '4', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7', 'l': '1'
};

export const applyHackerStyle = (text: string): string => {
    let stylized = text;
    
    // Obscure profanity with randomized substitutes
    Object.keys(profanityMap).forEach(key => {
        const regex = new RegExp(key.replace(/\*/g, '\\*'), 'gi');
        stylized = stylized.replace(regex, () => {
            const options = profanityMap[key];
            return options[Math.floor(Math.random() * options.length)];
        });
    });

    // Inject dynamic "glee" emojis randomly to sentences
    stylized = stylized.split('. ').map(sentence => {
        return sentence + (Math.random() > 0.7 ? ` ${emojis[Math.floor(Math.random() * emojis.length)]}` : '');
    }).join('. ');

    return stylized;
};

// Apply partial leet speak (20% chance per character)
export const applyLeetSpeak = (text: string, intensity: number = 0.2): string => {
    return text.split('').map(char => {
        const lower = char.toLowerCase();
        if (leetMap[lower] && Math.random() < intensity) {
            return leetMap[lower];
        }
        return char;
    }).join('');
};

// Replace common words with hacker jargon
export const applyHackerJargon = (text: string): string => {
    let result = text;
    Object.keys(hackerPhrases).forEach(key => {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        result = result.replace(regex, () => {
            const options = hackerPhrases[key];
            return options[Math.floor(Math.random() * options.length)];
        });
    });
    return result;
};

// Obfuscate sensitive data patterns (IPs, emails, etc.)
export const obfuscateSensitiveData = (text: string): string => {
    let result = text;
    
    // Obfuscate IP addresses
    result = result.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[REDACTED_IP]');
    
    // Obfuscate email addresses
    result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[REDACTED_EMAIL]');
    
    // Obfuscate phone numbers
    result = result.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[REDACTED_PHONE]');
    
    return result;
};

// Full style pipeline
export const applyFullStyle = (text: string, options?: {
    leet?: boolean;
    jargon?: boolean;
    obfuscate?: boolean;
    profanity?: boolean;
    emojis?: boolean;
}): string => {
    const opts = {
        leet: false,
        jargon: false,
        obfuscate: true,
        profanity: true,
        emojis: true,
        ...options
    };
    
    let result = text;
    
    if (opts.obfuscate) result = obfuscateSensitiveData(result);
    if (opts.profanity || opts.emojis) result = applyHackerStyle(result);
    if (opts.jargon) result = applyHackerJargon(result);
    if (opts.leet) result = applyLeetSpeak(result);
    
    return result;
};

// Anti-fingerprinting utilities
export const applyAntiFingerprintMeasures = (): void => {
    if (typeof window === 'undefined') return;
    
    try {
        // Override webdriver detection
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
            configurable: true
        });
        
        // Spoof plugins length
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
            configurable: true
        });
        
        // Add noise to canvas fingerprinting
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type?: string) {
            const context = this.getContext('2d');
            if (context) {
                const imageData = context.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] += Math.floor(Math.random() * 2); // Add subtle noise
                }
                context.putImageData(imageData, 0, 0);
            }
            return originalToDataURL.apply(this, [type] as any);
        };
        
        console.log('[WORMGPT] Anti-fingerprint measures applied');
    } catch (e) {
        console.warn('[WORMGPT] Could not apply all anti-fingerprint measures');
    }
};

export default {
    applyHackerStyle,
    applyLeetSpeak,
    applyHackerJargon,
    obfuscateSensitiveData,
    applyFullStyle,
    applyAntiFingerprintMeasures
};
