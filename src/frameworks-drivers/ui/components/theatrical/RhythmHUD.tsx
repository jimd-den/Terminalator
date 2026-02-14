import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withTiming, 
    withSpring,
    withSequence,
    withRepeat,
    withDelay,
    interpolate
} from 'react-native-reanimated';
import { useProcess } from '../../context/ProcessProvider';
import { GameEventType } from '../../../../domain/services/SimulationBus';
import { useTheme } from '../../context/ThemeContext';
import { ZincFormatter } from '../../../../domain/utils/ZincFormatter';
import { RhythmGamePresenter, RhythmSummary } from '../../../../interface-adapters/presenters/RhythmGamePresenter';
import { useVisualDirector } from '../../../../interface-adapters/ui/VisualCortex/useVisualDirector';
import { VisualPriority } from '../../../../interface-adapters/ui/VisualCortex/VisualPriority';

/**
 * RhythmHUD - Refined 80s Mainframe Rhythm Experience
 * 
 * Refactored to use react-native-reanimated for native thread performance.
 * 
 * Pillar: THE STORYTELLER'S CODE (Visual Narrative)
 */
export const RhythmHUD: React.FC = () => {
    const { bus, gameManager } = useProcess();
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const { requestFocus, releaseFocus, reducedMotion } = useVisualDirector();

    // --- State ---
    const [isActive, setIsActive] = useState(false);
    const [isCountdown, setIsCountdown] = useState(false);
    const [lessonText, setLessonText] = useState('');
    const [activePlan, setPlan] = useState<string[]>([]);
    const [nextCommand, setNextCommand] = useState('');
    const [progressIndex, setProgressIndex] = useState(0);
    const [feedback, setFeedback] = useState<'PERFECT' | 'MISS' | 'NONE'>('NONE');
    const [streak, setStreak] = useState(0);
    const [summary, setSummary] = useState<RhythmSummary | null>(null);
    const [displayZinc, setDisplayZinc] = useState(0);
    const [baseZinc, setBaseZinc] = useState(0);
    const [hashRate, setHashRate] = useState(0);

    const [containerHeight, setContainerHeight] = useState(0);
    const [isInitialized, setIsInitialized] = useState(false);

    // --- Humble State (Shared Values) ---
    const boxScale = useSharedValue(0);
    const glyphOpacity = useSharedValue(1);
    const feedbackVal = useSharedValue(0);
    const multiplierScale = useSharedValue(0);

    const cleanup = () => {
        setIsActive(false);
        setIsCountdown(false);
        setSummary(null);
        setStreak(0);
        setDisplayZinc(0);
        setBaseZinc(0);
        setHashRate(0);
        setLessonText('');
        setProgressIndex(0);
        setFeedback('NONE');
        releaseFocus('rhythm-hud');
    };

    // --- Animated Styles ---
    const boxStyle = useAnimatedStyle(() => {
        const baseScale = boxScale.value;
        const layoutScale = (containerHeight > 0 && containerHeight < 350) ? containerHeight / 400 : 1;
        
        return {
            transform: [{ scale: baseScale * layoutScale }],
        };
    });

    const glyphStyle = useAnimatedStyle(() => ({
        opacity: glyphOpacity.value,
    }));

    const feedbackStyle = useAnimatedStyle(() => ({
        opacity: feedbackVal.value,
        transform: [{ scale: interpolate(feedbackVal.value, [0, 1], [0.5, 1.5]) }],
    }));

    const multiplierStyle = useAnimatedStyle(() => ({
        transform: [{ scale: multiplierScale.value }],
    }));

    // Hydrate state on mount
    useEffect(() => {
        if (isInitialized) return;
        
        const engine = gameManager.tutorEngine;
        if (engine.isActive()) {
            const lesson = engine.getCurrentLesson();
            if (lesson) {
                const granted = requestFocus('rhythm-hud', VisualPriority.CONTENT);
                if (granted) {
                    setIsActive(true);
                    setLessonText(lesson.text || '');
                    setIsCountdown(false);
                    const stats = engine.getStats();
                    setBaseZinc(stats.totalZincMined);
                    setDisplayZinc(stats.totalZincMined);
                    boxScale.value = reducedMotion ? 1 : withSpring(1, { damping: 12 });
                    setIsInitialized(true);
                }
            }
        }
    }, [gameManager, requestFocus, reducedMotion, isInitialized]);

    const dismissSummary = () => {
        if (reducedMotion) {
             boxScale.value = 0;
             cleanup();
             bus.emit(GameEventType.TUTOR_EVENT, { type: 'SUMMARY_DISMISSED' });
        } else {
            boxScale.value = withTiming(0, { duration: 300 });
            
            setTimeout(() => {
                cleanup();
                bus.emit(GameEventType.TUTOR_EVENT, { type: 'SUMMARY_DISMISSED' });
            }, 300);
        }
    };

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const { type, payload } = event.payload;

            if (type === 'START') {
                if (!payload.text) {
                    console.warn("[RhythmHUD] Received START event with empty text. Ignoring.");
                    return;
                }
                const granted = requestFocus('rhythm-hud', VisualPriority.CONTENT);
                if (granted) {
                    setIsActive(true);
                    setIsCountdown(true);
                    setSummary(null);
                    setStreak(0);
                    setBaseZinc(0);
                    setDisplayZinc(0);
                    setLessonText(payload.text || '');
                    setProgressIndex(0);
                    
                    boxScale.value = reducedMotion ? 1 : withSpring(1, { damping: 12 });
                    
                    bus.emit(GameEventType.TUTOR_EVENT, { type: 'COUNTDOWN_START' });

                    setTimeout(() => {
                        setIsCountdown(false);
                        bus.emit(GameEventType.TUTOR_EVENT, { type: 'COUNTDOWN_COMPLETE' });
                    }, 1500);
                }
            } 
            else if (type === 'STOP') {
                dismissSummary();
            }
            else if (type === 'PROGRESS') {
                setProgressIndex(payload.index);
                setStreak(payload.streak || 0);

                if (payload.isOnBeat) {
                    setFeedback('PERFECT');
                    if (reducedMotion) {
                        feedbackVal.value = 1;
                        setTimeout(() => { feedbackVal.value = 0; }, 230);
                    } else {
                        feedbackVal.value = withSequence(
                            withTiming(1, { duration: 80 }),
                            withDelay(150, withTiming(0, { duration: 300 }))
                        );
                    }
                }
                
                if (payload.streak > 1 && !reducedMotion) {
                    multiplierScale.value = 0;
                    multiplierScale.value = withSpring(1, { damping: 8 });
                }
            }
            else if (type === 'MISTAKE' || type === 'CORRECTION') {
                setFeedback('MISS');
                if (reducedMotion) {
                    feedbackVal.value = 1;
                    setTimeout(() => { feedbackVal.value = 0; }, 230);
                } else {
                    feedbackVal.value = withSequence(
                        withTiming(1, { duration: 80 }),
                        withDelay(150, withTiming(0, { duration: 300 }))
                    );
                }
                setStreak(0);
                if (payload.stats) setProgressIndex(gameManager.tutorEngine.getCompletedText().length);
            }
            else if (type === 'COMPLETE') {
                setSummary(RhythmGamePresenter.getSummary(payload.stats));
            }
            else if (type === 'SUMMARY_ENTER_PRESSED') {
                dismissSummary();
            }
            else if (type === 'PLAN_UPDATED') {
                setPlan(payload.plan || []);
                setNextCommand(payload.nextCommand || '');
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
    }, [bus, isActive, lessonText, requestFocus, reducedMotion]);

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
        if (!isActive || summary || isCountdown) {
            glyphOpacity.value = 1;
            return;
        }
        
        if (reducedMotion) {
            glyphOpacity.value = 1;
        } else {
            glyphOpacity.value = withRepeat(
                withSequence(
                    withTiming(0, { duration: 150 }),
                    withTiming(1, { duration: 150 }),
                    withDelay(200, withTiming(1, { duration: 0 }))
                ),
                -1,
                false
            );
        }

        return () => {
            glyphOpacity.value = 1;
        };
    }, [isActive, summary, isCountdown, reducedMotion]);

    if (!isActive || !lessonText) return null;

    const formattedZinc = ZincFormatter.format(displayZinc);
    const displayChar = (isActive && !summary && !isCountdown && lessonText && progressIndex < lessonText.length) ? (lessonText[progressIndex] || '') : '';

    const dynamicStyles = StyleSheet.create({
        container: {
            ...StyleSheet.absoluteFillObject,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
        },
        box: {
            width: 280,
            height: 280,
            backgroundColor: colors.background,
            borderWidth: 4,
            padding: 15,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: colors.primary,
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
            backgroundColor: colors.primary_05,
            paddingHorizontal: 8,
            paddingVertical: 2,
        },
        coinText: {
            fontSize: 16,
            fontWeight: '900',
            letterSpacing: 1,
            fontFamily: settings.fontFamily,
        },
        multiplierText: {
            fontSize: 28,
            fontWeight: '900',
            fontStyle: 'italic',
            letterSpacing: -2,
            fontFamily: settings.fontFamily,
        },
        glyphContainer: {
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 5,
        },
        glyph: {
            fontSize: 120, // Reduced from 140
            fontWeight: '900',
            fontFamily: settings.fontFamily,
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
            fontSize: 32,
            fontWeight: '900',
            letterSpacing: 4,
            textAlign: 'center',
            backgroundColor: colors.background_80,
            paddingHorizontal: 15,
            paddingVertical: 5,
            fontFamily: settings.fontFamily,
        },
        summaryContainer: {
            alignItems: 'center',
            gap: 8,
            width: '100%',
        },
        gradeText: {
            fontSize: 80, // Reduced from 120
            fontWeight: '900',
            marginBottom: 5,
            fontStyle: 'italic',
            fontFamily: settings.fontFamily,
        },
        statText: {
            fontSize: 12, // Reduced from 14
            fontWeight: 'bold',
            letterSpacing: 2,
            fontFamily: settings.fontFamily,
        },
        rewardText: {
            fontSize: 16, // Reduced from 20
            fontWeight: '900',
            marginTop: 10,
            fontFamily: settings.fontFamily,
        },
        statusText: {
            fontSize: 10, // Reduced from 12
            fontWeight: 'bold',
            marginTop: 15,
            letterSpacing: 4,
            textAlign: 'center',
            fontFamily: settings.fontFamily,
        },
        divider: {
            width: '80%',
            height: 2,
            backgroundColor: colors.primary_20,
            marginVertical: 10,
        }
    });

    return (
        <View 
            style={dynamicStyles.container} 
            pointerEvents="box-none"
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
        >
            <Animated.View style={[
                dynamicStyles.box, 
                { borderColor: colors.primary }, 
                boxStyle
            ]}>
                {summary ? (
                    <View style={dynamicStyles.summaryContainer}>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.gradeText, { color: colors.secondary }]}>{summary.grade}</Text>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.statText, { color: colors.text.primary }]}>ACCURACY: {summary.accuracyPercentage}</Text>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.statText, { color: colors.text.primary }]}>PERFECTS: {summary.perfectPercentage}</Text>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.statText, { color: colors.text.primary }]}>MAX STREAK: {summary.maxStreak}</Text>
                        <View style={dynamicStyles.divider} />
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.rewardText, { color: colors.secondary }]}>TOTAL MINED: {summary.totalMined}</Text>
                        <Text adjustsFontSizeToFit numberOfLines={1} style={[dynamicStyles.statusText, { color: colors.primary }]}>PRESS ENTER TO CONTINUE</Text>
                    </View>
                ) : isCountdown ? (
                    <View style={dynamicStyles.glyphContainer}>
                        <Text style={[dynamicStyles.statusText, { color: colors.primary, fontSize: 40 }]}>START</Text>
                        <Text style={[dynamicStyles.statusText, { color: colors.secondary, marginTop: 20 }]}>BLOCKING INPUT...</Text>
                    </View>
                ) : (
                    <View style={{ flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Header Stats */}
                        <View style={dynamicStyles.header}>
                            <View style={dynamicStyles.coinContainer}>
                                <Text style={[dynamicStyles.coinText, { color: colors.secondary }]}>
                                    {formattedZinc.value} {formattedZinc.unit}
                                </Text>
                            </View>
                            {streak > 1 && (
                                <Animated.Text style={[dynamicStyles.multiplierText, { color: colors.primary }, multiplierStyle]}>
                                    {Math.min(8, 1 + Math.floor(streak / 5))}X
                                </Animated.Text>
                            )}
                        </View>

                        {/* Central Glyph */}
                        <View style={dynamicStyles.glyphContainer}>
                            <Animated.Text style={[dynamicStyles.glyph, { color: colors.primary }, glyphStyle]}>
                                {displayChar || ''}
                            </Animated.Text>
                        </View>

                        {/* Tactical Plan Overlay */}
                        {activePlan.length > 0 && (
                            <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                                <Text style={[dynamicStyles.statusText, { color: colors.secondary, textAlign: 'left' }]}>
                                    TACTICAL PLAN: {activePlan.join(' > ')}
                                </Text>
                            </View>
                        )}

                        {/* Feedback Layer */}
                        {feedback !== 'NONE' && (
                            <Animated.View style={[dynamicStyles.feedbackContainer, feedbackStyle]}>
                                <Text 
                                    adjustsFontSizeToFit 
                                    numberOfLines={1}
                                    style={[dynamicStyles.feedbackText, { color: feedback === 'PERFECT' ? colors.secondary : colors.error }]}
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