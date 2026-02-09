import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { THEME } from '../../Theme';
import { useTheme } from '../../context/ThemeContext';

interface ResultCard {
    id: string;
    command: string;
    output: string;
    exitCode: number;
    timestamp: number;
    hostname: string;
}

/**
 * ResultStackView - Presentation Layer Component
 * 
 * Displays a persistent stack of command results as "Cards".
 * Cards are static flexible squares that scroll with the output.
 * 
 * Pillar: THE STORYTELLER'S CODE (Persistence)
 * Pillar: THE HUMBLE OBJECT (Decoupled History)
 */
export const ResultStackView: React.FC = () => {
    const { bus } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    
    const [cards, setCards] = useState<ResultCard[]>([]);
    const scrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;
            
            if (type === 'RESULT_CARD') {
                setCards(prev => [...prev, payload].slice(-10)); // Keep last 10
            }
        });

        return () => unsub();
    }, [bus]);

    useEffect(() => {
        // Auto-scroll to bottom when new card arrives
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, [cards]);

    if (cards.length === 0) return null;

    return (
        <View style={styles.container}>
            <ScrollView 
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.content}
                pointerEvents="none"
            >
                {cards.map(card => (
                    <View key={card.id} style={[styles.card, { borderColor: card.exitCode === 0 ? colors.primary : colors.error }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardTitle, { color: card.exitCode === 0 ? colors.primary : colors.error }]}>
                                {card.exitCode === 0 ? '[ OK ]' : '[ ERR ]'}
                            </Text>
                            <Text style={[styles.cardMeta, { color: colors.text.dim }]}>
                                {card.hostname} // {new Date(card.timestamp).toLocaleTimeString()}
                            </Text>
                        </View>
                        <Text style={[styles.cardCmd, { color: colors.secondary, fontFamily: settings.fontFamily }]}>
                            $ {card.command}
                        </Text>
                        {card.output ? (
                            <Text numberOfLines={5} style={[styles.cardOutput, { color: colors.text.primary, fontFamily: settings.fontFamily }]}>
                                {card.output}
                            </Text>
                        ) : null}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        padding: THEME.spacing.md,
        zIndex: 1, // Under the active animation layer but over the raw text
    },
    scroll: {
        flex: 1,
    },
    content: {
        justifyContent: 'flex-end',
        minHeight: '100%',
        gap: 15,
        paddingBottom: 40,
        alignItems: 'center', // Center cards
    },
    card: {
        borderWidth: 2, // Match Canvas border
        backgroundColor: 'rgba(0,0,0,0.95)', // Match Canvas bg
        padding: 15,
        width: '85%', // Consistent width
        alignSelf: 'center',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 6,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    cardMeta: {
        fontSize: 10,
    },
    cardCmd: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    cardOutput: {
        fontSize: 12,
        opacity: 0.9,
        lineHeight: 18,
    }
});