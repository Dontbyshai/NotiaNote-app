import React from 'react';
import { View, Text, Image, useWindowDimensions } from 'react-native';

/**
 * Composant de rendu HTML "Maître-Nageur" (Custom/Lightweight)
 * Affiche le texte nettoyé et les images extraites du HTML brut.
 * Evite d'utiliser une librairie lourde comme react-native-render-html.
 */
const CustomHtmlRender = ({ html, baseStyle }) => {
    const { width } = useWindowDimensions();

    if (!html) return null;

    // Fonction de nettoyage
    const cleanText = (text) => {
        if (!text) return "";
        let cleaned = text
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]+>/g, '') // Strip remaining tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();
        return cleaned;
    };

    // 1. Parser les liens <a>
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi;
    const partsWithLinks = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const textBefore = html.substring(lastIndex, match.index);
        if (textBefore) partsWithLinks.push({ type: 'html_chunk', content: textBefore });

        partsWithLinks.push({
            type: 'link',
            href: match[1],
            text: cleanText(match[2]) || "Fichier/Lien"
        });

        lastIndex = match.index + match[0].length;
    }
    const textAfter = html.substring(lastIndex);
    if (textAfter) partsWithLinks.push({ type: 'html_chunk', content: textAfter });
    if (partsWithLinks.length === 0 && html) partsWithLinks.push({ type: 'html_chunk', content: html });

    // 2. Parser les images dans les chunks HTML
    const finalParts = [];
    const imgRegex = /<img[^>]+src="([^">]+)"[^>]*>/gi;

    partsWithLinks.forEach(part => {
        if (part.type === 'link') {
            finalParts.push(part);
        } else {
            // C'est du HTML/Texte, on cherche des images dedans
            let subHtml = part.content;
            let subLastIndex = 0;
            let subMatch;

            // Re-init regex state just in case
            imgRegex.lastIndex = 0;

            while ((subMatch = imgRegex.exec(subHtml)) !== null) {
                const subTextBefore = subHtml.substring(subLastIndex, subMatch.index);
                if (subTextBefore.trim()) finalParts.push({ type: 'text', content: cleanText(subTextBefore) });

                finalParts.push({ type: 'img', src: subMatch[1] });
                subLastIndex = subMatch.index + subMatch[0].length;
            }
            const subTextAfter = subHtml.substring(subLastIndex);
            if (subTextAfter.trim()) finalParts.push({ type: 'text', content: cleanText(subTextAfter) });
        }
    });

    return (
        <View>
            {finalParts.map((part, index) => {
                if (part.type === 'text') {
                    return (
                        <Text key={index} style={[baseStyle, { marginBottom: 8 }]}>
                            {part.content}
                        </Text>
                    );
                } else if (part.type === 'img') {
                    return (
                        <Image
                            key={index}
                            source={{ uri: part.src }}
                            style={{
                                width: width - 90,
                                height: 200,
                                resizeMode: 'contain',
                                marginVertical: 10,
                                borderRadius: 8,
                                backgroundColor: 'rgba(0,0,0,0.2)'
                            }}
                        />
                    );
                } else if (part.type === 'link') {
                    // Rendu du lien/bouton
                    // On detecte si c'est un fichier ecoledirecte
                    const isEDFile = part.href.includes("telechargement.awp");

                    if (isEDFile) {
                        // On essaie d'extraire l'ID
                        // ...?verbe=get&fichierId=123&...
                        // Regex match
                        const idMatch = part.href.match(/fichierId=(\d+)/);
                        const fileId = idMatch ? idMatch[1] : null;

                        // Render as pseudo-button (simplifié pour l'instant)
                        return (
                            <View key={index} style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue tint
                                borderRadius: 8,
                                padding: 10,
                                marginVertical: 5,
                                borderWidth: 1,
                                borderColor: 'rgba(59, 130, 246, 0.3)'
                            }}>
                                <Text style={{ color: '#60A5FA', fontWeight: 'bold' }}>📄 {part.text} (Lien fichier)</Text>
                                <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 2 }}>Ce fichier est lié dans le texte. Il devrait apparaître aussi dans la liste des pièces jointes en bas.</Text>
                            </View>
                        );
                    }

                    // Lien normal
                    return (
                        <Text key={index} style={[baseStyle, { color: '#60A5FA', textDecorationLine: 'underline', marginBottom: 8 }]}>
                            {part.text} (Lien externe)
                        </Text>
                    );
                }
                return null;
            })}
        </View>
    );
};

export default CustomHtmlRender;
