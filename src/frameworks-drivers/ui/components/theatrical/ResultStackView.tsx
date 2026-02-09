import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Platform, Dimensions } from 'react-native';
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
    verb: string;
    isHistory: boolean;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;':,./<>?";

const MorphingText: React.FC<{ 
    from: string, 
    to: string, 
    isMorphing: boolean, 
    isSettled: boolean,
    style: any 
}> = ({ from, to, isMorphing, isSettled, style }) => {
    const [display, setDisplay] = useState(isSettled ? to : from);
    
    useEffect(() => {
        if (isSettled) {
            setDisplay(to);
            return;
        }

        if (!isMorphing) {
            setDisplay(from);
            return;
        }

        let step = 0;
        const totalSteps = 25;
        const interval = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            const currentLen = Math.floor(from.length + (to.length - from.length) * progress);
            
            const scrambled = Array.from({ length: currentLen }).map((_, i) => {
                if (progress > 0.6 && i < to.length) return to[i];
                return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
            }).join('');

            setDisplay(scrambled);

            if (step >= totalSteps) {
                clearInterval(interval);
                setDisplay(to);
            }
        }, 30);

        return () => clearInterval(interval);
    }, [from, to, isMorphing, isSettled]);

    return <Text style={style}>{display}</Text>;
};

/**
 * TypewriterOutput - Implementation Layer
 * 
 * Reveals the command output character by character.
 */
const TypewriterOutput: React.FC<{ text: string, style: any }> = ({ text, style }) => {
    const [display, setDisplay] = useState('');
    
    useEffect(() => {
        if (!text) {
            setDisplay('');
            return;
        }
        
        let cursor = 0;
        const batchSize = 4; // Reveal speed
        const interval = setInterval(() => {
            cursor += batchSize;
            setDisplay(text.substring(0, cursor));
            if (cursor >= text.length) clearInterval(interval);
        }, 16); // 60fps

        return () => clearInterval(interval);
    }, [text]);

    return <Text style={style}>{display}</Text>;
};

export const ResultStackView: React.FC = () => {
    const { bus } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    
    const [history, setHistory] = useState<ResultCard[]>([]);
    const [activeCard, setActiveCard] = useState<ResultCard | null>(null);
    const [isSettling, setIsSettling] = useState(false);

    // --- Animation Values ---
    const moveAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const widthAnim = useRef(new Animated.Value(350)).current; 
    const useNativeDriver = Platform.OS !== 'web';

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;
            
            if (type === 'PRESENTATION_START') {
                setActiveCard({
                    id: 'active',
                    command: payload.command,
                    verb: payload.verb || 'PROCESSING',
                    output: '',
                    exitCode: 0,
                    timestamp: Date.now(),
                    hostname: 'SYSTEM',
                    isHistory: false
                });
                moveAnim.setValue({ x: 0, y: 0 }); 
                scaleAnim.setValue(1.1);
                widthAnim.setValue(350);
                
                setTimeout(() => {
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload.command } });
                }, 600);

            } else if (type === 'PRESENTATION_RESULT') {
                setActiveCard(prev => prev ? { ...prev, exitCode: payload.exitCode } : null);
                setTimeout(() => settleActiveCard(payload.command), 1000);

            } else if (type === 'RESULT_CARD') {
                setActiveCard(prev => prev ? { ...prev, output: payload.output, hostname: payload.hostname } : null);
                setHistory(prev => prev.map(c => c.command === payload.command ? { ...c, output: payload.output } : c));
            }
        });

        return () => unsub();
    }, [bus]);

    const settleActiveCard = (command: string) => {
        setIsSettling(true);
        
        Animated.parallel([
            Animated.timing(moveAnim.y, { toValue: 280, duration: 800, useNativeDriver }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver }),
            Animated.timing(widthAnim, { toValue: Dimensions.get('window').width * 0.9, duration: 800, useNativeDriver: false })
        ]).start(() => {
            setActiveCard(current => {
                if (current) {
                    const finalCard = { ...current, isHistory: true };
                    setHistory(prev => [...prev, finalCard].slice(-10));
                }
                return null;
            });
            setIsSettling(false);
            bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command } });
        });
    };

    const renderCard = (card: ResultCard, isCurrentlyActive: boolean) => {
        const isError = card.exitCode !== 0;
        const borderColor = isError ? colors.error : colors.primary;

        const cardStyle = isCurrentlyActive ? {
            transform: [{ translateY: moveAnim.y }, { scale: scaleAnim }],
            width: widthAnim,
            zIndex: 100,
            alignSelf: 'center' as const,
            position: 'absolute' as const,
            top: '20%'
        } : {
            width: '90%',
            alignSelf: 'center' as const,
        };

        // Determine when to show output: ONLY when it is history (docked)
        const showOutput = card.isHistory && card.output;

        return (
            <Animated.View key={isCurrentlyActive ? `active-${card.timestamp}` : card.id} style={[styles.card, { borderColor }, cardStyle]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text.dim }]}>
                        {card.hostname} // {new Date(card.timestamp).toLocaleTimeString()}
                    </Text>
                    <Text style={[styles.cardTitle, { color: borderColor }]}>
                        {card.exitCode === 0 ? '[ OK ]' : '[ ERR ]'}
                    </Text>
                </View>
                
                <View style={styles.mainContent}>
                    <MorphingText 
                        from={card.verb} 
                        to={`$ ${card.command}`} 
                        isMorphing={isCurrentlyActive && isSettling}
                        isSettled={card.isHistory}
                        style={[
                            styles.contentStyle, 
                            { 
                                color: (isCurrentlyActive && !isSettling) ? colors.primary : colors.secondary,
                                fontSize: (isCurrentlyActive && !isSettling) ? 32 : 16,
                                fontWeight: (isCurrentlyActive && !isSettling) ? '900' : 'bold',
                                letterSpacing: (isCurrentlyActive && !isSettling) ? 8 : 1,
                                textAlign: (isCurrentlyActive && !isSettling) ? 'center' : 'left',
                                width: '100%'
                            }
                        ]}
                    />
                </View>
                
                {showOutput ? (
                    <View style={styles.outputContainer}>
                        <TypewriterOutput 
                            text={card.output} 
                            style={[styles.cardOutput, { color: colors.text.primary, fontFamily: settings.fontFamily }]}
                        />
                    </View>
                ) : null}
            </Animated.View>
        );
    };

    return (
        <View style={styles.container} pointerEvents="none">
            <ScrollView 
                style={styles.scroll}
                contentContainerStyle={styles.historyContent}
            >
                {history.map(c => renderCard(c, false))}
            </ScrollView>

            {activeCard && renderCard(activeCard, true)}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    scroll: {
        flex: 1,
    },
    historyContent: {
        justifyContent: 'flex-end',
        minHeight: '100%',
        paddingBottom: 140, 
        gap: 20,
    },
    card: {
        borderWidth: 2,
        backgroundColor: '#000',
        padding: 15,
        minHeight: 60,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        paddingBottom: 6,
    },
    cardTitle: {
        fontSize: 10,
        fontFamily: THEME.typography.fontFamily,
        letterSpacing: 1,
    },
    mainContent: {
        justifyContent: 'center',
        paddingVertical: 10,
    },
    contentStyle: {
        fontFamily: THEME.typography.fontFamily,
    },
    outputContainer: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    cardOutput: {
        fontSize: 12,
        lineHeight: 18,
    }
});