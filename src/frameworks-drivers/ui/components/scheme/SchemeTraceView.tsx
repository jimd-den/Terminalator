/**
 * SchemeTraceView - Presentation Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Watching Scheme Run
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A printed trace tells you what happened. Nintendo's habit is to make the RULE
 * visible instead -- so this replays evaluation as a physical thing, and leans
 * the whole design on one contrast the VM already knows about:
 *
 *   A CALL stacks a new frame onto the tower.
 *   A TAIL CALL replaces the top frame in place -- the tower does not grow.
 *
 * That single difference is the hardest idea in early Scheme and the easiest
 * one to show. A player runs a recursive sum and watches the tower climb; runs
 * the same loop written tail-recursively and watches one block flip over and
 * over without ever stacking. Nobody has to explain why tail recursion matters
 * after they have seen that twice.
 *
 * Continuations get the other treatment: capture plants a flag, and invoking
 * one warps back to it. That metaphor is not decoration -- it is what call/cc
 * actually does.
 *
 * The player drives. Playback can be paused and stepped, because an animation
 * you cannot stop is a cutscene, and cutscenes do not teach.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, ScrollView } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { EvalStep, StepKind, TraceResult, STEP_GLYPH } from '../../../../domain/usecases/SchemeTrace';
import { DURATION, EASE, SPRING, pressIn, pressOut, popEmphasis } from '../../Motion';

/** Milliseconds per step at 1x. Slow enough to read a line, fast enough to binge. */
const BEAT = 420;

interface Props {
    trace: TraceResult;
}

/** Which theme colour carries each kind of step. */
const toneFor = (kind: StepKind, colors: any): string => {
    switch (kind) {
        case 'call':      return colors.primary;
        case 'tail-call': return colors.secondary;
        case 'return':    return colors.text.dim;
        case 'capture':
        case 'warp':      return colors.secondary;
        case 'raise':     return colors.error;
        default:          return colors.text.dim;
    }
};

/**
 * One block in the frame tower.
 *
 * `flipKey` changes whenever a tail call reuses this frame; changing it
 * re-triggers the flip so the reuse is visible rather than a silent relabel.
 */
const Frame: React.FC<{
    label: string; tone: string; colors: any; font: string; flipKey: number; fresh: boolean;
}> = ({ label, tone, colors, font, flipKey, fresh }) => {
    const enterAnim = useRef(new Animated.Value(fresh ? 0 : 1)).current;
    const flip = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (fresh) {
            Animated.spring(enterAnim, { toValue: 1, ...SPRING.bouncy, useNativeDriver: true }).start();
        }
    }, [enterAnim, fresh]);

    useEffect(() => {
        if (flipKey === 0) return;
        // A quick squash-and-recover reads as "the same block, new contents",
        // which is exactly what frame reuse is.
        flip.setValue(0);
        Animated.sequence([
            Animated.timing(flip, { toValue: 1, duration: DURATION.instant, easing: EASE.snap, useNativeDriver: true }),
            Animated.spring(flip, { toValue: 0, ...SPRING.bouncy, useNativeDriver: true })
        ]).start();
    }, [flipKey, flip]);

    const scaleY = flip.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] });

    return (
        <Animated.View
            style={{
                opacity: enterAnim,
                transform: [
                    { scaleY },
                    { translateX: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }
                ],
                borderLeftWidth: 3,
                borderLeftColor: tone,
                backgroundColor: colors.surface ?? colors.background,
                paddingVertical: 3,
                paddingHorizontal: 8,
                marginBottom: 2
            }}
        >
            <Text style={{ color: tone, fontFamily: font, fontSize: 11 }} numberOfLines={1}>
                {label}
            </Text>
        </Animated.View>
    );
};

export const SchemeTraceView: React.FC<Props> = ({ trace }) => {
    const { theme, settings } = useTheme();
    const colors = theme.colors;
    const font = settings.fontFamily;

    const [cursor, setCursor] = useState(0);
    const [playing, setPlaying] = useState(true);
    // Variable lookups outnumber calls roughly five to one and bury the call
    // and return structure that the view exists to show, so they start hidden
    // and are available for a player who wants the fine grain.
    const [showLookups, setShowLookups] = useState(false);
    const logRef = useRef<ScrollView>(null);
    const savedPulse = useRef(new Animated.Value(1)).current;

    const steps = React.useMemo(
        () => showLookups ? trace.steps : trace.steps.filter(s => s.kind !== 'lookup'),
        [trace.steps, showLookups]
    );
    const done = cursor >= steps.length;

    // Changing the filter changes what step N means, so restart rather than
    // leave the tower describing a different point than the log.
    useEffect(() => { setCursor(0); setPlaying(true); }, [showLookups]);

    // ── playback ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!playing || done) return;
        const timer = setTimeout(() => setCursor(c => c + 1), BEAT);
        return () => clearTimeout(timer);
    }, [playing, cursor, done]);

    useEffect(() => {
        const t = setTimeout(() => logRef.current?.scrollToEnd({ animated: true }), 60);
        return () => clearTimeout(t);
    }, [cursor]);

    // ── derive the frame tower from the steps played so far ──────────────────
    // Rebuilding from scratch keeps the tower honest: it is a projection of the
    // trace, so scrubbing backwards cannot desynchronise it from the log.
    const played = steps.slice(0, cursor);
    const tower: { label: string; kind: StepKind; flips: number }[] = [];
    let savedFrames = 0;
    let flagPlanted = false;
    let warped = false;

    for (const s of played) {
        switch (s.kind) {
            case 'call':
                tower.push({ label: `${s.label ?? 'lambda'} ${s.detail ?? ''}`.trim(), kind: 'call', flips: 0 });
                break;
            case 'tail-call': {
                savedFrames++;
                const top = tower[tower.length - 1];
                if (top) {
                    // Reuse: same block, new contents.
                    top.label = `${s.label ?? 'lambda'} ${s.detail ?? ''}`.trim();
                    top.kind = 'tail-call';
                    top.flips++;
                } else {
                    tower.push({ label: `${s.label ?? 'lambda'} ${s.detail ?? ''}`.trim(), kind: 'tail-call', flips: 1 });
                }
                break;
            }
            case 'return':
                tower.pop();
                break;
            case 'capture': flagPlanted = true; break;
            case 'warp':    warped = true; break;
        }
    }

    const current = steps[Math.min(cursor, steps.length - 1)];

    useEffect(() => {
        if (current?.kind === 'tail-call') popEmphasis(savedPulse, 1.4).start();
    }, [cursor, current?.kind, savedPulse]);

    const styles = StyleSheet.create({
        wrap: { borderWidth: 1, borderColor: colors.border, marginTop: 6 },
        header: {
            flexDirection: 'row', alignItems: 'center', gap: 8,
            paddingHorizontal: 8, paddingVertical: 4,
            borderBottomWidth: 1, borderBottomColor: colors.border
        },
        title: { color: colors.primary, fontFamily: font, fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
        stat: { color: colors.text.dim, fontFamily: font, fontSize: 9 },
        body: { flexDirection: 'row', minHeight: 150 },
        towerCol: {
            width: '46%', padding: 6,
            borderRightWidth: 1, borderRightColor: colors.border,
            justifyContent: 'flex-end'   // frames stack upward, like a stack
        },
        logCol: { flex: 1, padding: 6 },
        colLabel: { color: colors.text.dim, fontFamily: font, fontSize: 9, letterSpacing: 1, marginBottom: 4 },
        logLine: { fontFamily: font, fontSize: 10, lineHeight: 15 },
        controls: {
            flexDirection: 'row', alignItems: 'center', gap: 6,
            paddingHorizontal: 8, paddingVertical: 5,
            borderTopWidth: 1, borderTopColor: colors.border
        },
        btnText: { color: colors.background, fontFamily: font, fontSize: 10, fontWeight: 'bold' },
        footer: { color: colors.text.dim, fontFamily: font, fontSize: 9, paddingHorizontal: 8, paddingBottom: 6 }
    });

    const Btn: React.FC<{ label: string; onPress: () => void; tone?: string }> = ({ label, onPress, tone }) => {
        const scale = useRef(new Animated.Value(1)).current;
        return (
            <Animated.View style={{ transform: [{ scale }] }}>
                <Pressable
                    onPressIn={() => pressIn(scale).start()}
                    onPressOut={() => pressOut(scale).start()}
                    onPress={onPress}
                    style={{ backgroundColor: tone ?? colors.primary, paddingHorizontal: 8, paddingVertical: 3 }}
                >
                    <Text style={styles.btnText}>{label}</Text>
                </Pressable>
            </Animated.View>
        );
    };

    const restart = useCallback(() => { setCursor(0); setPlaying(true); }, []);

    return (
        <View style={styles.wrap}>
            <View style={styles.header}>
                <Text style={styles.title}>EVALUATION</Text>
                <View style={{ flex: 1 }} />
                <Text style={styles.stat}>depth {trace.maxDepth}</Text>
                <Animated.Text style={[styles.stat, {
                    color: colors.secondary,
                    transform: [{ scale: savedPulse }]
                }]}>
                    {savedFrames} reused
                </Animated.Text>
            </View>

            <View style={styles.body}>
                {/* The tower: the whole point is whether it grows. */}
                <View style={styles.towerCol}>
                    <Text style={styles.colLabel}>FRAMES</Text>
                    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                        {tower.length === 0 && (
                            <Text style={[styles.stat, { fontStyle: 'italic' }]}>empty</Text>
                        )}
                        {tower.slice(-9).map((f, i) => (
                            <Frame
                                key={`${i}-${f.label}`}
                                label={f.label}
                                tone={toneFor(f.kind, colors)}
                                colors={colors}
                                font={font}
                                flipKey={f.flips}
                                fresh={f.kind === 'call'}
                            />
                        ))}
                    </View>
                </View>

                {/* The log: what just happened, in order. */}
                <View style={styles.logCol}>
                    <Text style={styles.colLabel}>STEPS</Text>
                    <ScrollView ref={logRef} showsVerticalScrollIndicator={false}>
                        {played.map((s, i) => {
                            const { glyph } = STEP_GLYPH[s.kind];
                            const tone = toneFor(s.kind, colors);
                            const isCurrent = i === played.length - 1;
                            return (
                                <Text
                                    key={i}
                                    style={[styles.logLine, {
                                        color: tone,
                                        opacity: isCurrent ? 1 : 0.55,
                                        fontWeight: isCurrent ? 'bold' : 'normal'
                                    }]}
                                    numberOfLines={1}
                                >
                                    {'  '.repeat(Math.min(s.depth, 6))}{glyph} {s.label ?? ''} {s.detail ?? ''}
                                </Text>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            <View style={styles.controls}>
                <Btn label={playing ? '❚❚' : '▶'} onPress={() => setPlaying(p => !p)} />
                <Btn
                    label="STEP"
                    onPress={() => { setPlaying(false); setCursor(c => Math.min(c + 1, steps.length)); }}
                    tone={colors.secondary}
                />
                <Btn label="↺" onPress={restart} tone={colors.text.dim} />
                <Btn
                    label={showLookups ? 'VARS ON' : 'VARS'}
                    onPress={() => setShowLookups(v => !v)}
                    tone={showLookups ? colors.secondary : colors.text.dim}
                />
                <View style={{ flex: 1 }} />
                <Text style={styles.stat}>{Math.min(cursor, steps.length)}/{steps.length}</Text>
            </View>

            {(flagPlanted || warped || trace.elided > 0) && (
                <Text style={styles.footer}>
                    {flagPlanted && '⚑ continuation captured  '}
                    {warped && '⇜ warped back  '}
                    {trace.elided > 0 && `… ${trace.elided} steps elided`}
                </Text>
            )}
        </View>
    );
};
