import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ScrollView, Platform, Dimensions } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { THEME } from '../../Theme';
import { useTheme } from '../../context/ThemeContext';
import { WidgetContext, InlineWidget } from '../OutputContainer';
import { DURATION, EASE, SPRING, enter, enterStyle } from '../../Motion';
import { classify, lookFor, accentColor } from '../../CommandFamily';

/**
 * Wraps a settled card so it rises and springs into the stack rather than
 * appearing. Each card owns its driver, so a new result animates without
 * disturbing the scrollback above it.
 */
const SettledCard: React.FC<{ children: React.ReactNode; style: any }> = ({ children, style }) => {
    const appear = useRef(new Animated.Value(0)).current;
    useEffect(() => { enter(appear).start(); }, [appear]);
    const e = enterStyle(appear, 18);
    return (
        <Animated.View style={[style, { opacity: e.opacity, transform: e.transform }]}>
            {children}
        </Animated.View>
    );
};

interface ResultCard {
    id: string;
    command: string;
    output: string;
    exitCode: number;
    timestamp: number;
    hostname: string;
    verb: string;
    isHistory: boolean;
    metadata?: any;
}

interface ResultStackViewProps {
    widgetContext?: WidgetContext;
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
export const ResultStackView: React.FC<ResultStackViewProps> = ({ widgetContext }) => {
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
            
            try {
                if (type === 'PRESENTATION_START') {
                    setActiveCard({
                        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        command: payload.command,
                        verb: payload.verb || 'PROCESSING',
                        output: '',
                        exitCode: 0,
                        timestamp: Date.now(),
                        hostname: 'SYSTEM',
                        isHistory: false,
                        metadata: undefined
                    });
                    moveAnim.setValue({ x: 0, y: 0 }); 
                    scaleAnim.setValue(1.1);
                    widthAnim.setValue(350);
                    
                    // Trigger entry animation
                    scaleAnim.setValue(0.8);
                    Animated.parallel([
                        Animated.spring(scaleAnim, { toValue: 1.1, ...SPRING.bouncy, useNativeDriver: false }),
                        Animated.timing(widthAnim, {
                            toValue: 350,
                            duration: DURATION.base,
                            easing: EASE.pop,
                            useNativeDriver: false
                        })
                    ]).start();
                    
                    setTimeout(() => {
                        bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload.command } });
                    }, 600);

                } else if (type === 'PRESENTATION_RESULT') {
                    setActiveCard(prev => prev ? { ...prev, exitCode: payload.exitCode } : null);
                    
                    const isClear = payload.command && payload.command.trim().toUpperCase() === 'CLEAR';

                    if (isClear) {
                        performClearAnimation().then(() => {
                            setTimeout(() => settleActiveCard(payload.command), 200);
                        });
                    } else {
                        setTimeout(() => settleActiveCard(payload.command), 1000);
                    }

                } else if (type === 'RESULT_CARD') {
                    setActiveCard(prev => prev ? { 
                        ...prev, 
                        output: payload.output, 
                        hostname: payload.hostname,
                        metadata: payload.metadata 
                    } : null);
                    setHistory(prev => prev.map(c => c.command === payload.command ? { ...c, output: payload.output, metadata: payload.metadata } : c));
                }
            } catch (err) {
                console.error("[ResultStackView] Error handling event:", err);
                // Emergency release of locks if animation fails
                if (type === 'PRESENTATION_START' || type === 'PRESENTATION_RESULT') {
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'ANIMATION_COMPLETE', payload: { command: payload?.command || 'ERROR' } });
                }
            }
        });

        return () => unsub();
    }, [bus, history, containerHeight]);

    // Ensure scroll to bottom
    useEffect(() => {
        const timer = setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return () => clearTimeout(timer);
    }, [history, activeCard, isSettling]);

    const settleActiveCard = (command: string) => {
        setIsSettling(true);
        
        const targetY = containerHeight > 0 ? containerHeight * 0.4 : 300; 
        
        // The card travels down into the stack and settles with a spring
        // rather than easing linearly to a stop -- the overshoot is what makes
        // it read as an object being placed instead of a value being tweened.
        Animated.parallel([
            Animated.timing(moveAnim.y, {
                toValue: targetY,
                duration: DURATION.theatrical,
                easing: EASE.anticipate,
                useNativeDriver: false
            }),
            Animated.spring(scaleAnim, { toValue: 1, ...SPRING.firm, useNativeDriver: false }),
            Animated.timing(widthAnim, {
                toValue: Dimensions.get('window').width * 0.95,
                duration: DURATION.theatrical,
                easing: EASE.snap,
                useNativeDriver: false
            })
        ]).start(() => {
            setActiveCard(current => {
                if (current) {
                    const finalCard = { ...current, isHistory: true };
                    setHistory(prev => [...prev, finalCard].slice(-60));
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
        // Bottom-anchored like a real terminal, but at terminal density. The
        // old spacing (20pt padding, 30pt gaps, a 70pt floor per card) meant a
        // phone showed barely two commands and a large empty band above them.
        historyContent: {
            justifyContent: 'flex-end',
            minHeight: '100%',
            paddingBottom: 8,
            gap: 10,
        },
        card: {
            borderWidth: 1,
            backgroundColor: colors.background,
            paddingHorizontal: 12,
            paddingVertical: 8,
        },
        cardHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 6,
            borderBottomWidth: 1,
            borderBottomColor: colors.primary_20,
            paddingBottom: 4,
        },
        cardTitle: {
            fontSize: 10,
            fontFamily: settings.fontFamily,
            // Tightened from 2: three header fields now share this row, and
            // wide tracking pushed the timestamp into a wrap on a phone.
            letterSpacing: 0.5,
            fontWeight: 'bold',
            flexShrink: 1,
        },
        mainContent: {
            justifyContent: 'center',
        },
        contentStyle: {
            fontFamily: settings.fontFamily,
        },
        outputContainer: {
            marginTop: 6,
            paddingTop: 6,
            borderTopWidth: 1,
            borderTopColor: colors.primary_10,
        },
        cardOutput: {
            fontSize: 12,
            lineHeight: 17,
            fontFamily: settings.fontFamily,
        }
    });

    const renderCard = (card: ResultCard, isCurrentlyActive: boolean) => {
        // Each command family carries its own accent and sigil so a long
        // scrollback stays skimmable -- you find a past result by its shape
        // rather than by reading every card.
        const family = classify(card.command, card.exitCode);
        const look = lookFor(family);
        const borderColor = accentColor(family, colors);

        const cardStyle = isCurrentlyActive ? {
            transform: [{ translateY: moveAnim.y }, { scale: scaleAnim }],
            width: widthAnim,
            zIndex: 100,
            alignSelf: 'center' as const,
            position: 'absolute' as const,
            top: 20
        } : {
            width: '100%' as any,
            alignSelf: 'stretch' as const,
        };

        const isPreExec = isCurrentlyActive && !isSettling;

        const body = (
            <>
                <View style={dynamicStyles.cardHeader}>
                    <Text style={[dynamicStyles.cardTitle, { color: borderColor }]}>
                        {look.sigil} {look.label}
                    </Text>
                    <Text style={[dynamicStyles.cardTitle, { color: colors.text.dim }]} numberOfLines={1}>
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
                                color: isPreExec ? colors.primary : borderColor,
                                fontSize: isPreExec ? 32 : 14,
                                fontWeight: isPreExec ? '900' : 'bold',
                                letterSpacing: isPreExec ? 8 : 0.5,
                                textAlign: isPreExec ? 'center' : 'left',
                                width: '100%'
                            }
                        ]}
                    />
                </View>
                
                {card.isHistory && (
                    <View style={dynamicStyles.outputContainer}>
                        {card.metadata?.renderType === 'scheme-trace' ? (
                            <InlineWidget type="scheme-trace" data={card.metadata.data} />
                        ) : card.metadata?.renderType === 'archive-widget' ? (
                            <InlineWidget type="archive-widget" context={widgetContext} />
                        ) : card.output ? (
                            <TypewriterOutput 
                                text={card.output} 
                                style={[dynamicStyles.cardOutput, { color: colors.text.primary, fontFamily: settings.fontFamily }]}
                            />
                        ) : null}
                    </View>
                )}
            </>
        );

        // The active card is driven by the settle animation; history cards get
        // their own entrance so the stack builds rather than blinks.
        return isCurrentlyActive ? (
            <Animated.View key={card.id} style={[dynamicStyles.card, { borderColor }, cardStyle]}>
                {body}
            </Animated.View>
        ) : (
            <SettledCard key={card.id} style={[dynamicStyles.card, { borderColor }, cardStyle]}>
                {body}
            </SettledCard>
        );
    };

    return (
        <View 
            style={dynamicStyles.container} 
            pointerEvents="box-none" // Allow interactions with children (scroll, widgets)
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
