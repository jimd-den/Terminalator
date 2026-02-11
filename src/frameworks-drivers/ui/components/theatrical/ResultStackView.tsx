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

const TypewriterOutput: React.FC<{ text: string, style: any }> = ({ text, style }) => {
    const [display, setDisplay] = useState('');
    
    useEffect(() => {
        if (!text) {
            setDisplay('');
            return;
        }
        
        let cursor = 0;
        const batchSize = 4;
        const interval = setInterval(() => {
            cursor += batchSize;
            setDisplay(text.substring(0, cursor));
            if (cursor >= text.length) clearInterval(interval);
        }, 16);

        return () => clearInterval(interval);
    }, [text]);

    return <Text style={style}>{display}</Text>;
};

/**
 * ResultStackView - Refined Theatrical Console
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 * 
 * Features:
 * 1. Bottom-docking animation (Stack shifts UP).
 * 2. Clear animation (One-by-one sequential pop).
 * 3. Bottom-weighted scrolling.
 */
export const ResultStackView: React.FC = () => {
    const { bus } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    
    const [history, setHistory] = useState<ResultCard[]>([]);
    const [activeCard, setActiveCard] = useState<ResultCard | null>(null);
    const [isSettling, setIsSettling] = useState(false);
    
    const [containerHeight, setContainerHeight] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const useNativeDriver = Platform.OS !== 'web';

    // --- Animation Values ---
    const moveAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const widthAnim = useRef(new Animated.Value(350)).current; 

    // Handle "CLEAR" command specifically
    const performClearAnimation = async () => {
        // Pop them out one by one fast
        const currentHistory = [...history];
        for (let i = currentHistory.length - 1; i >= 0; i--) {
            await new Promise(resolve => setTimeout(resolve, 50));
            setHistory(prev => prev.slice(0, i));
        }
        // Ensure it's fully empty at the end
        setHistory([]);
    };

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;
            
            if (type === 'PRESENTATION_START') {
                setActiveCard({
                    id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
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
                
                // Trigger entry animation
                Animated.parallel([
                    Animated.spring(scaleAnim, { toValue: 1.1, friction: 4, useNativeDriver: false }),
                    Animated.timing(widthAnim, { toValue: 350, duration: 200, useNativeDriver: false })
                ]).start();
                
                setTimeout(() => {
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload.command } });
                }, 600);

            } else if (type === 'PRESENTATION_RESULT') {
                setActiveCard(prev => prev ? { ...prev, exitCode: payload.exitCode } : null);
                
                // If it was a CLEAR command, trigger pop animation
                const isClear = payload.command && payload.command.trim().toUpperCase() === 'CLEAR';

                if (isClear) {
                    performClearAnimation().then(() => {
                        setTimeout(() => settleActiveCard(payload.command), 200);
                    });
                } else {
                    setTimeout(() => settleActiveCard(payload.command), 1000);
                }

            } else if (type === 'RESULT_CARD') {
                setActiveCard(prev => prev ? { ...prev, output: payload.output, hostname: payload.hostname } : null);
                setHistory(prev => prev.map(c => c.command === payload.command ? { ...c, output: payload.output } : c));
            }
        });

        return () => unsub();
    }, [bus, history, containerHeight]); // Re-subscribe if height changes

    // Ensure scroll to bottom
    useEffect(() => {
        const timer = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [history, activeCard, isSettling]);

    const settleActiveCard = (command: string) => {
        setIsSettling(true);
        
        // Target: Dock at the bottom. 
        // Use containerHeight to ensure it doesn't go below the IRC chat
        const targetY = containerHeight > 0 ? containerHeight * 0.4 : 300; 
        
        Animated.parallel([
            Animated.timing(moveAnim.y, { toValue: targetY, duration: 800, useNativeDriver: false }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
            Animated.timing(widthAnim, { toValue: Dimensions.get('window').width * 0.95, duration: 800, useNativeDriver: false })
        ]).start(() => {
            setActiveCard(current => {
                if (current) {
                    const finalCard = { ...current, isHistory: true };
                    setHistory(prev => [...prev, finalCard].slice(-15));
                }
                return null;
            });
            setIsSettling(false);
            bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command } });
        });
    };

    const dynamicStyles = StyleSheet.create({
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
            paddingBottom: 40, // Reduced padding
            gap: 30,
        },
        card: {
            borderWidth: 2,
            backgroundColor: colors.background,
            padding: 20,
            minHeight: 70,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary_20,
            paddingBottom: 8,
        },
        cardTitle: {
            fontSize: 11,
            fontFamily: settings.fontFamily,
            letterSpacing: 2,
            fontWeight: 'bold',
        },
        mainContent: {
            justifyContent: 'center',
            paddingVertical: 12,
        },
        contentStyle: {
            fontFamily: settings.fontFamily,
        },
        outputContainer: {
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.primary_10,
        },
        cardOutput: {
            fontSize: 13,
            lineHeight: 20,
            letterSpacing: 0.5,
            fontFamily: settings.fontFamily,
        }
    });

    const renderCard = (card: ResultCard, isCurrentlyActive: boolean) => {
        const isError = card.exitCode !== 0;
        const borderColor = isError ? colors.error : colors.primary;

        const cardStyle = isCurrentlyActive ? {
            transform: [{ translateY: moveAnim.y }, { scale: scaleAnim }],
            width: widthAnim,
            zIndex: 100,
            alignSelf: 'center' as const,
            position: 'absolute' as const,
            top: 20 // Move from 100 to 20 to stay within top box
        } : {
            width: '95%' as any, // Use any to allow percentage string in union type
            alignSelf: 'center' as const,
        };

        const isPreExec = isCurrentlyActive && !isSettling;

        return (
            <Animated.View key={card.id} style={[dynamicStyles.card, { borderColor }, cardStyle]}>
                <View style={dynamicStyles.cardHeader}>
                    <Text style={[dynamicStyles.cardTitle, { color: colors.text.dim }]}>
                        {card.hostname} // {new Date(card.timestamp).toLocaleTimeString()}
                    </Text>
                    <Text style={[dynamicStyles.cardTitle, { color: borderColor }]}>
                        {card.exitCode === 0 ? '[ OK ]' : '[ ERR ]'}
                    </Text>
                </View>
                
                <View style={dynamicStyles.mainContent}>
                    <MorphingText 
                        from={card.verb} 
                        to={`$ ${card.command}`} 
                        isMorphing={isCurrentlyActive && isSettling}
                        isSettled={card.isHistory}
                        style={[
                            dynamicStyles.contentStyle, 
                            { 
                                color: isPreExec ? colors.primary : colors.secondary,
                                fontSize: isPreExec ? 32 : 16,
                                fontWeight: isPreExec ? '900' : 'bold',
                                letterSpacing: isPreExec ? 8 : 1,
                                textAlign: isPreExec ? 'center' : 'left',
                                width: '100%'
                            }
                        ]}
                    />
                </View>
                
                {card.isHistory && card.output ? (
                    <View style={dynamicStyles.outputContainer}>
                        <TypewriterOutput 
                            text={card.output} 
                            style={[dynamicStyles.cardOutput, { color: colors.text.primary, fontFamily: settings.fontFamily }]}
                        />
                    </View>
                ) : null}
            </Animated.View>
        );
    };

    return (
        <View 
            style={dynamicStyles.container} 
            pointerEvents="none"
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
            <ScrollView 
                ref={scrollRef}
                style={dynamicStyles.scroll}
                contentContainerStyle={dynamicStyles.historyContent}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
                {history.map(c => renderCard(c, false))}
            </ScrollView>

            {activeCard && renderCard(activeCard, true)}
        </View>
    );
};

// Remove static styles
