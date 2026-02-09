import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform, Dimensions } from 'react-native';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { THEME } from '../../Theme';
import { useTheme } from '../../context/ThemeContext';
import { ZincFormatter } from '../../../../domain/utils/ZincFormatter';
import { RhythmGamePresenter, RhythmSummary } from '../../../../interface-adapters/presenters/RhythmGamePresenter';

/**
 * RhythmHUD - Refined 80s Mainframe Rhythm Experience
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 */
export const RhythmHUD: React.FC = () => {
    const { bus, gameManager } = useProcess();
    const { theme } = useTheme();
    const colors = theme.colors;

    // --- State ---
    const [isActive, setIsActive] = useState(false);
    const [isCountdown, setIsCountdown] = useState(false);
    const [lessonText, setLessonText] = useState('');
    const [targetChar, setTargetChar] = useState('');
    const [progressIndex, setProgressIndex] = useState(0);
    const [feedback, setFeedback] = useState<'PERFECT' | 'MISS' | 'NONE'>('NONE');
    const [streak, setStreak] = useState(0);
    const [summary, setSummary] = useState<RhythmSummary | null>(null);
    const [baseZinc, setBaseZinc] = useState(0);
    const [displayZinc, setDisplayZinc] = useState(0);
    const [hashRate, setHashRate] = useState(0);

    // --- Animation Values ---
    const boxScale = useRef(new Animated.Value(0)).current;
    const glyphBlink = useRef(new Animated.Value(1)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const multiplierAnim = useRef(new Animated.Value(0)).current;
    
    const useNativeDriver = Platform.OS !== 'web';

    // Hydrate state on mount
    useEffect(() => {
        const engine = gameManager.tutorEngine;
        if (engine.isActive()) {
            const lesson = engine.getCurrentLesson();
            if (lesson) {
                setIsActive(true);
                setLessonText(lesson.text);
                setIsCountdown(false);
                const stats = engine.getStats();
                setBaseZinc(stats.totalZincMined);
                setDisplayZinc(stats.totalZincMined);
                Animated.spring(boxScale, { toValue: 1, friction: 6, useNativeDriver }).start();
            }
        }
    }, []);

    const dismissSummary = () => {
        Animated.timing(boxScale, { toValue: 0, duration: 300, useNativeDriver }).start(() => {
            setIsActive(false);
            setSummary(null);
            bus.emit(GameEventType.TUTOR_EVENT, { type: 'SUMMARY_DISMISSED' });
        });
    };

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;

            if (type === 'START') {
                setIsActive(true);
                setIsCountdown(true);
                setSummary(null);
                setStreak(0);
                setBaseZinc(0);
                setDisplayZinc(0);
                setLessonText(payload.text || '');
                setProgressIndex(0);
                
                Animated.spring(boxScale, { toValue: 1, friction: 6, useNativeDriver }).start();
                
                // Signal countdown start to block input
                bus.emit(GameEventType.TUTOR_EVENT, { type: 'COUNTDOWN_START' });

                // Start Sequence
                setTimeout(() => {
                    setIsCountdown(false);
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'COUNTDOWN_COMPLETE' });
                }, 1500);
            } 
            else if (type === 'PROGRESS') {
                setProgressIndex(payload.index);
                setStreak(payload.streak || 0);
                
                const nextChar = lessonText[payload.index] || '';
                setTargetChar(nextChar);

                if (payload.isOnBeat) triggerFeedback('PERFECT');
                if (payload.streak > 1) triggerMultiplierPop();
            }
            else if (type === 'MISTAKE' || type === 'CORRECTION') {
                triggerFeedback('MISS');
                setStreak(0);
                if (payload.stats) setProgressIndex(gameManager.tutorEngine.getCompletedText().length);
            }
            else if (type === 'COMPLETE') {
                setTargetChar('');
                setSummary(RhythmGamePresenter.getSummary(payload.stats));
            }
            else if (type === 'SUMMARY_ENTER_PRESSED') {
                dismissSummary();
            }
        });

        const unsubEcon = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            if (isActive) {
                setBaseZinc(event.payload.sessionReward);
                setHashRate(event.payload.hashRate);
            }
        });

        return () => {
            unsub();
            unsubEcon();
        };
    }, [bus, isActive, lessonText]);

    // Continuous Coin Interpolation Animation
    useEffect(() => {
        if (!isActive) return;
        let lastTime = Date.now();
        const animate = () => {
            const now = Date.now();
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            setDisplayZinc(prev => {
                const target = baseZinc;
                const diff = target - prev;
                const predictedGain = hashRate * dt; 
                return prev + (diff * 0.1) + predictedGain; 
            });
            requestAnimationFrame(animate);
        };
        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [isActive, baseZinc, hashRate]);

    // Blinking logic for target glyph
    useEffect(() => {
        if (!isActive || summary || isCountdown) return;
        const blink = Animated.loop(
            Animated.sequence([
                Animated.timing(glyphBlink, { toValue: 0, duration: 150, useNativeDriver }),
                Animated.timing(glyphBlink, { toValue: 1, duration: 150, useNativeDriver }),
                Animated.delay(200)
            ])
        );
        blink.start();
        return () => blink.stop();
    }, [isActive, summary, isCountdown]);

    const triggerFeedback = (type: 'PERFECT' | 'MISS') => {
        setFeedback(type);
        feedbackAnim.setValue(0);
        Animated.sequence([
            Animated.timing(feedbackAnim, { toValue: 1, duration: 80, useNativeDriver }),
            Animated.timing(feedbackAnim, { toValue: 0, duration: 300, delay: 150, useNativeDriver })
        ]).start(() => setFeedback('NONE'));
    };

    const triggerMultiplierPop = () => {
        multiplierAnim.setValue(0);
        Animated.spring(multiplierAnim, { toValue: 1, friction: 4, useNativeDriver }).start();
    };

    if (!isActive) return null;

    const formattedZinc = ZincFormatter.format(displayZinc);
    const displayChar = (isActive && !summary && !isCountdown && progressIndex < lessonText.length) ? (lessonText[progressIndex] || '') : '';

    return (
        <View style={styles.container} pointerEvents="box-none">
            <Animated.View style={[styles.box, { borderColor: colors.primary, transform: [{ scale: boxScale }] }]}>
                {summary ? (
                    <View style={styles.summaryContainer}>
                        <Text style={[styles.gradeText, { color: colors.secondary }]}>{summary.grade}</Text>
                        <Text style={[styles.statText, { color: colors.text.primary }]}>ACCURACY: {summary.accuracyPercentage}</Text>
                        <Text style={[styles.statText, { color: colors.text.primary }]}>PERFECTS: {summary.perfectPercentage}</Text>
                        <Text style={[styles.statText, { color: colors.text.primary }]}>MAX STREAK: {summary.maxStreak}</Text>
                        <View style={styles.divider} />
                        <Text style={[styles.rewardText, { color: colors.secondary }]}>TOTAL MINED: {summary.totalMined}</Text>
                        <Text style={[styles.statusText, { color: colors.primary }]}>PRESS ENTER TO CONTINUE</Text>
                    </View>
                ) : isCountdown ? (
                    <View style={styles.glyphContainer}>
                        <Text style={[styles.statusText, { color: colors.primary, fontSize: 40 }]}>START</Text>
                        <Text style={[styles.statusText, { color: colors.secondary, marginTop: 20 }]}>BLOCKING INPUT...</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Header Stats */}
                        <View style={styles.header}>
                            <View style={styles.coinContainer}>
                                <Text style={[styles.coinText, { color: colors.secondary }]}>
                                    {formattedZinc.value} {formattedZinc.unit}
                                </Text>
                            </View>
                            {streak > 1 && (
                                <Animated.Text style={[styles.multiplierText, { color: colors.primary, transform: [{ scale: multiplierAnim }] }]}>
                                    {Math.min(8, 1 + Math.floor(streak / 5))}X
                                </Animated.Text>
                            )}
                        </View>

                        {/* Central Glyph */}
                        <View style={styles.glyphContainer}>
                            <Animated.Text style={[styles.glyph, { color: colors.primary, opacity: glyphBlink }]}>
                                {displayChar || ''}
                            </Animated.Text>
                        </View>

                        {/* Feedback Layer */}
                        {feedback !== 'NONE' && (
                            <Animated.View style={[styles.feedbackContainer, { opacity: feedbackAnim, transform: [{ scale: feedbackAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }] }]}>
                                <Text 
                                    adjustsFontSizeToFit 
                                    numberOfLines={1}
                                    style={[styles.feedbackText, { color: feedback === 'PERFECT' ? colors.secondary : colors.error }]}
                                >
                                    {feedback === 'PERFECT' ? 'PERFECT' : 'MISS'}
                                </Text>
                            </Animated.View>
                        )}
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    box: {
        width: 320,
        height: 320,
        backgroundColor: '#000',
        borderWidth: 4,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: THEME.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        overflow: 'hidden',
    },
    header: {
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    coinContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    coinText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        fontFamily: THEME.typography.fontFamily,
    },
    multiplierText: {
        fontSize: 28,
        fontWeight: '900',
        fontStyle: 'italic',
        letterSpacing: -2,
    },
    glyphContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 5,
    },
    glyph: {
        fontSize: 140,
        fontWeight: '900',
        fontFamily: THEME.typography.fontFamily,
    },
    feedbackContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    feedbackText: {
        fontSize: 32, // Reduced to ensure it fits without truncation
        fontWeight: '900',
        letterSpacing: 4,
        textAlign: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 15,
        paddingVertical: 5,
    },
    summaryContainer: {
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    gradeText: {
        fontSize: 120,
        fontWeight: '900',
        marginBottom: 10,
        fontStyle: 'italic',
    },
    statText: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    rewardText: {
        fontSize: 20,
        fontWeight: '900',
        marginTop: 15,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 25,
        letterSpacing: 6,
        textAlign: 'center',
    },
    divider: {
        width: 240,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginVertical: 15,
    }
});
